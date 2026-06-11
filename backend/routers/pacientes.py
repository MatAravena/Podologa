"""
Pacientes router.

Admin (JWT required):
  GET  /admin/pacientes              — list all patients (search by nombre/email)
  GET  /admin/pacientes/{id}         — patient profile: data + citas + notas
  POST /admin/pacientes/{id}/notas   — add clinical note
  PATCH  /admin/pacientes/{id}/notas/{nota_id} — update note
  DELETE /admin/pacientes/{id}/notas/{nota_id} — delete note
  POST /admin/pacientes/{id}/generar-token     — generate / regenerate portal token

Public (token-based, no login):
  GET /pacientes/{token}/perfil — patient portal (only visible_paciente=True notes)
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth import get_current_admin
from config import settings
from database import get_db
from models import NotaPaciente, Paciente, User
from notifications.pacientes_notify import notificar_resumen, tipo_label
from rate_limit import rate_limit
from schemas import (
    NotaPacienteCreate,
    NotaPacienteOut,
    NotaPacienteUpdate,
    NotificarPacienteRequest,
    NotificarPacienteResponse,
    PacienteDetalleOut,
    PacienteOut,
    PortalPacienteOut,
)

router = APIRouter(tags=["pacientes"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_paciente_or_404(paciente_id: int, db: Session) -> Paciente:
    p = db.query(Paciente).filter(Paciente.id == paciente_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")
    return p


def _get_nota_or_404(nota_id: int, paciente_id: int, db: Session) -> NotaPaciente:
    n = db.query(NotaPaciente).filter(
        NotaPaciente.id == nota_id,
        NotaPaciente.paciente_id == paciente_id,
    ).first()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nota no encontrada")
    return n


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/pacientes", response_model=List[PacienteOut])
def listar_pacientes(
    q: str | None = Query(default=None, description="Buscar por nombre o email"),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    query = db.query(Paciente)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Paciente.nombre.ilike(like)) | (Paciente.email.ilike(like))
        )
    return query.order_by(Paciente.nombre).all()


@router.get("/admin/pacientes/{paciente_id}", response_model=PacienteDetalleOut)
def obtener_paciente(
    paciente_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    return _get_paciente_or_404(paciente_id, db)


@router.post(
    "/admin/pacientes/{paciente_id}/notas",
    response_model=NotaPacienteOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_nota(
    paciente_id: int,
    payload: NotaPacienteCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    _get_paciente_or_404(paciente_id, db)
    nota = NotaPaciente(paciente_id=paciente_id, **payload.model_dump())
    db.add(nota)
    db.commit()
    db.refresh(nota)
    return nota


@router.patch("/admin/pacientes/{paciente_id}/notas/{nota_id}", response_model=NotaPacienteOut)
def actualizar_nota(
    paciente_id: int,
    nota_id: int,
    payload: NotaPacienteUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    nota = _get_nota_or_404(nota_id, paciente_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(nota, field, value)
    db.commit()
    db.refresh(nota)
    return nota


@router.delete("/admin/pacientes/{paciente_id}/notas/{nota_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_nota(
    paciente_id: int,
    nota_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    nota = _get_nota_or_404(nota_id, paciente_id, db)
    db.delete(nota)
    db.commit()


@router.post("/admin/pacientes/{paciente_id}/generar-token", response_model=PacienteOut)
def generar_token(
    paciente_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    paciente = _get_paciente_or_404(paciente_id, db)
    paciente.access_token = secrets.token_urlsafe(32)
    paciente.access_token_expira = datetime.now(timezone.utc) + timedelta(
        days=settings.PORTAL_TOKEN_EXPIRE_DAYS
    )
    db.commit()
    db.refresh(paciente)
    return paciente


@router.post(
    "/admin/pacientes/{paciente_id}/notificar",
    response_model=NotificarPacienteResponse,
)
def notificar_paciente(
    paciente_id: int,
    payload: NotificarPacienteRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Manually send the patient their visible notes and/or a suggested next
    appointment date through the chosen channels. Controlled by the admin —
    never automatic. Returns a per-channel result so the UI can show what worked.
    """
    paciente = _get_paciente_or_404(paciente_id, db)

    notas: list[tuple[str, str]] = []
    if payload.incluir_notas:
        notas = [
            (tipo_label(n.tipo), n.contenido)
            for n in paciente.notas_clinicas
            if n.visible_paciente
        ]

    # Nothing to send → reject instead of mailing an empty message
    if not notas and payload.proxima_cita is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nada que enviar: marca notas visibles para incluir o define una fecha sugerida.",
        )

    resultados = notificar_resumen(
        email=paciente.email,
        telefono=paciente.telefono,
        nombre=paciente.nombre,
        notas=notas,
        proxima_cita=payload.proxima_cita,
        canales=payload.canales,
    )
    return NotificarPacienteResponse(resultados=resultados)


# ── Public portal endpoint ────────────────────────────────────────────────────

@router.get(
    "/pacientes/{token}/perfil",
    response_model=PortalPacienteOut,
    # Anti-enumeration: max 20 lookups per IP per minute on health data
    dependencies=[Depends(rate_limit("portal", limit=20, window=60))],
)
def portal_paciente(token: str, db: Session = Depends(get_db)):
    paciente = db.query(Paciente).filter(Paciente.access_token == token).first()
    if not paciente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Historial no encontrado")

    # Reject expired tokens — same 404 to avoid leaking that the token once existed
    expira = paciente.access_token_expira
    if expira is not None:
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if expira < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Historial no encontrado")

    notas_visibles = [n for n in paciente.notas_clinicas if n.visible_paciente]

    return PortalPacienteOut(
        nombre=paciente.nombre,
        notas_clinicas=notas_visibles,
    )
