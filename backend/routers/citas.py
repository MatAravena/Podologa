import secrets
from datetime import date, datetime, time, timezone
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from auth import get_current_admin
from database import get_db
from integrations.google_calendar import calendar_service
from notifications.citas_notify import send_welcome
from models import Cita, Paciente, Servicio, EstadoCita, Promocion, User
from routers.promociones import _is_currently_active
from schemas import CitaAdminOut, CitaOut, CitaUpdate

router = APIRouter(prefix="/citas", tags=["citas"])
admin_router = APIRouter(prefix="/admin/citas", tags=["citas-admin"])


# ── Public booking payload (frontend form) ────────────────────────────────────

class CitaPublicaCreate(BaseModel):
    """Payload sent from the Angular booking form."""
    nombre: str = Field(..., min_length=2, max_length=255)
    apellido: str = Field(default="", max_length=255)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    servicio_id: int
    fecha: date
    hora: str = Field(..., pattern=r"^\d{1,2}:\d{2}$")
    notas: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=CitaOut, status_code=status.HTTP_201_CREATED)
def crear_cita(
    payload: CitaPublicaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    servicio = db.query(Servicio).filter(Servicio.id == payload.servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")

    # Reuse existing patient by email, or create a new one
    paciente = None
    if payload.email:
        paciente = db.query(Paciente).filter(Paciente.email == payload.email).first()

    nombre_completo = f"{payload.nombre} {payload.apellido}".strip()
    if not paciente:
        paciente = Paciente(
            nombre=nombre_completo,
            email=payload.email,
            telefono=payload.telefono,
            notas=payload.notas,
        )
        db.add(paciente)
        db.flush()
    else:
        if payload.telefono:
            paciente.telefono = payload.telefono

    hora_h, hora_m = payload.hora.split(":")
    try:
        hora_time = time(int(hora_h), int(hora_m))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Hora inválida.")

    # Apply the best active promotion for this service, if any
    from datetime import date as date_cls
    today = date_cls.today()
    promos = db.query(Promocion).filter(
        Promocion.activo.is_(True),
        Promocion.servicio_id == servicio.id,
        Promocion.fecha_inicio <= today,
        Promocion.fecha_fin >= today,
    ).order_by(Promocion.porcentaje_descuento.desc()).all()
    active_promo = next((p for p in promos if _is_currently_active(p)), None)

    precio_final = None
    promocion_id = None
    if active_promo and servicio.precio:
        # Whole Chilean pesos (no decimals) — precio and porcentaje are integers.
        precio_final = servicio.precio * (100 - active_promo.porcentaje_descuento) // 100
        promocion_id = active_promo.id

    cita = Cita(
        fecha=payload.fecha,
        hora=hora_time,
        duracion=servicio.duracion,
        estado=EstadoCita.PENDIENTE,
        paciente_id=paciente.id,
        servicio_id=servicio.id,
        precio_final=precio_final,
        promocion_id=promocion_id,
        confirm_token=secrets.token_urlsafe(32),  # unique link for self-confirmation
    )
    db.add(cita)
    db.commit()
    db.refresh(cita)

    # Welcome message (email + WhatsApp) — thanks for booking, no action needed yet.
    # The confirmation request goes out 48h before via the scheduler.
    fecha_str = payload.fecha.strftime("%d/%m/%Y")
    background_tasks.add_task(
        send_welcome,
        email=payload.email,
        telefono=paciente.telefono,
        nombre=payload.nombre,
        servicio=servicio.nombre,
        fecha=fecha_str,
        hora=payload.hora,
    )

    # Create Google Calendar event in background (fire-and-forget)
    background_tasks.add_task(
        _sync_calendar_on_create,
        cita_id=cita.id,
        fecha=cita.fecha,
        hora=cita.hora,
        duracion=cita.duracion,
        paciente_nombre=payload.nombre,
        servicio_nombre=servicio.nombre,
        notas=payload.notas,
    )

    return cita


def _sync_calendar_on_create(
    cita_id: int,
    fecha,
    hora,
    duracion: int,
    paciente_nombre: str,
    servicio_nombre: str,
    notas: str | None,
) -> None:
    """Create a Google Calendar event and persist the event_id back to the DB."""
    from database import SessionLocal
    event_id = calendar_service.create_event(
        fecha=fecha,
        hora=hora,
        duracion_min=duracion,
        paciente_nombre=paciente_nombre,
        servicio_nombre=servicio_nombre,
        notas=notas,
    )
    if event_id:
        db = SessionLocal()
        try:
            cita = db.query(Cita).filter(Cita.id == cita_id).first()
            if cita:
                cita.google_event_id = event_id
                db.commit()
        finally:
            db.close()


@router.get("/{cita_id}", response_model=CitaOut)
def obtener_cita(cita_id: int, db: Session = Depends(get_db)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")
    return cita


# ── Public self-confirmation (token-based, no login) ──────────────────────────

class ConfirmacionOut(BaseModel):
    """Read-only view of a cita for the public confirmation page."""
    servicio: str
    fecha: date
    hora: str
    estado: str
    paciente_confirmo: bool | None
    paciente_nombre: str


class ConfirmacionRespuesta(BaseModel):
    asistira: bool


def _cita_por_token(token: str, db: Session) -> Cita:
    cita = db.query(Cita).filter(Cita.confirm_token == token).first()
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")
    return cita


@router.get("/confirmar/{token}", response_model=ConfirmacionOut)
def ver_confirmacion(token: str, db: Session = Depends(get_db)):
    """Details shown on the public confirmation page."""
    cita = _cita_por_token(token, db)
    return ConfirmacionOut(
        servicio=cita.servicio.nombre if cita.servicio else "Servicio",
        fecha=cita.fecha,
        hora=cita.hora.strftime("%H:%M"),
        estado=cita.estado.value,
        paciente_confirmo=cita.paciente_confirmo,
        paciente_nombre=(cita.paciente.nombre.split()[0] if cita.paciente else ""),
    )


@router.post("/confirmar/{token}", response_model=ConfirmacionOut)
def responder_confirmacion(
    token: str,
    payload: ConfirmacionRespuesta,
    db: Session = Depends(get_db),
):
    """Patient confirms (asistira=True) or cancels (asistira=False) their attendance."""
    cita = _cita_por_token(token, db)

    cita.paciente_confirmo = payload.asistira
    cita.confirmacion_respondida_at = datetime.now(timezone.utc)
    cita.estado = EstadoCita.CONFIRMADA if payload.asistira else EstadoCita.CANCELADA
    db.commit()
    db.refresh(cita)

    # If cancelled, remove the Google Calendar event (best-effort).
    if not payload.asistira and cita.google_event_id:
        try:
            calendar_service.delete_event(cita.google_event_id)
        except Exception as exc:  # noqa: BLE001
            print(f"[citas] calendar delete on patient-cancel failed: {exc}")

    return ConfirmacionOut(
        servicio=cita.servicio.nombre if cita.servicio else "Servicio",
        fecha=cita.fecha,
        hora=cita.hora.strftime("%H:%M"),
        estado=cita.estado.value,
        paciente_confirmo=cita.paciente_confirmo,
        paciente_nombre=(cita.paciente.nombre.split()[0] if cita.paciente else ""),
    )


@router.patch("/{cita_id}/estado", response_model=CitaOut)
def actualizar_estado(
    cita_id: int,
    payload: CitaUpdate,
    db: Session = Depends(get_db),
):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cita no encontrada")
    old_estado = cita.estado
    old_fecha, old_hora = cita.fecha, cita.hora

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cita, field, value)
    db.commit()
    db.refresh(cita)

    # Sync Google Calendar
    if cita.google_event_id:
        if cita.estado == EstadoCita.CANCELADA and old_estado != EstadoCita.CANCELADA:
            calendar_service.delete_event(cita.google_event_id)
        elif (cita.fecha != old_fecha or cita.hora != old_hora):
            calendar_service.update_event(
                cita.google_event_id,
                fecha=cita.fecha,
                hora=cita.hora,
                duracion_min=cita.duracion,
            )

    return cita


# ── Admin agenda ──────────────────────────────────────────────────────────────

@admin_router.get("", response_model=List[CitaAdminOut])
def listar_citas_admin(
    desde: date | None = None,
    hasta: date | None = None,
    estado: EstadoCita | None = None,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Appointments for the admin agenda, with confirmation + calendar-sync info."""
    query = db.query(Cita)
    if desde is not None:
        query = query.filter(Cita.fecha >= desde)
    if hasta is not None:
        query = query.filter(Cita.fecha <= hasta)
    if estado is not None:
        query = query.filter(Cita.estado == estado)

    citas = query.order_by(Cita.fecha.asc(), Cita.hora.asc()).all()

    return [
        CitaAdminOut(
            id=c.id,
            fecha=c.fecha,
            hora=c.hora,
            duracion=c.duracion,
            estado=c.estado,
            paciente_nombre=c.paciente.nombre if c.paciente else "",
            paciente_email=c.paciente.email if c.paciente else None,
            paciente_telefono=c.paciente.telefono if c.paciente else None,
            servicio_nombre=c.servicio.nombre if c.servicio else None,
            precio_final=c.precio_final,
            paciente_confirmo=c.paciente_confirmo,
            confirmacion_48h_enviada=c.confirmacion_48h_enviada,
            confirmacion_24h_enviada=c.confirmacion_24h_enviada,
            sincronizada_calendar=bool(c.google_event_id),
        )
        for c in citas
    ]
