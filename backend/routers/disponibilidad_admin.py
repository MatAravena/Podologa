from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_admin
from database import get_db
from models import BloqueDisponibilidad, FechaBloqueo, User
from schemas import (
    BloqueDisponibilidadCreate,
    BloqueDisponibilidadOut,
    BloqueDisponibilidadUpdate,
    FechaBloqueoCreate,
    FechaBloqueoOut,
)

router = APIRouter(prefix="/admin/disponibilidad", tags=["disponibilidad-admin"])

# ── Bloques horarios ──────────────────────────────────────────────────────────

@router.get("/bloques", response_model=List[BloqueDisponibilidadOut])
def listar_bloques(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return db.query(BloqueDisponibilidad).order_by(
        BloqueDisponibilidad.dia_semana,
        BloqueDisponibilidad.fecha_especifica,
        BloqueDisponibilidad.hora_inicio,
    ).all()


@router.post("/bloques", response_model=BloqueDisponibilidadOut, status_code=status.HTTP_201_CREATED)
def crear_bloque(
    payload: BloqueDisponibilidadCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if payload.dia_semana is None and payload.fecha_especifica is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debes indicar dia_semana o fecha_especifica",
        )
    if payload.dia_semana is not None and payload.fecha_especifica is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No puedes indicar dia_semana y fecha_especifica al mismo tiempo",
        )
    bloque = BloqueDisponibilidad(**payload.model_dump())
    db.add(bloque)
    db.commit()
    db.refresh(bloque)
    return bloque


@router.patch("/bloques/{bloque_id}", response_model=BloqueDisponibilidadOut)
def actualizar_bloque(
    bloque_id: int,
    payload: BloqueDisponibilidadUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    bloque = db.query(BloqueDisponibilidad).filter(BloqueDisponibilidad.id == bloque_id).first()
    if not bloque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(bloque, field, value)
    db.commit()
    db.refresh(bloque)
    return bloque


@router.delete("/bloques/{bloque_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_bloque(
    bloque_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    bloque = db.query(BloqueDisponibilidad).filter(BloqueDisponibilidad.id == bloque_id).first()
    if not bloque:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloque no encontrado")
    db.delete(bloque)
    db.commit()


# ── Fechas bloqueadas ─────────────────────────────────────────────────────────

@router.get("/bloqueos", response_model=List[FechaBloqueoOut])
def listar_bloqueos(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return db.query(FechaBloqueo).order_by(FechaBloqueo.fecha).all()


@router.post("/bloqueos", response_model=FechaBloqueoOut, status_code=status.HTTP_201_CREATED)
def crear_bloqueo(
    payload: FechaBloqueoCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    existing = db.query(FechaBloqueo).filter(FechaBloqueo.fecha == payload.fecha).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un bloqueo para {payload.fecha}",
        )
    bloqueo = FechaBloqueo(**payload.model_dump())
    db.add(bloqueo)
    db.commit()
    db.refresh(bloqueo)
    return bloqueo


@router.delete("/bloqueos/{bloqueo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_bloqueo(
    bloqueo_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    bloqueo = db.query(FechaBloqueo).filter(FechaBloqueo.id == bloqueo_id).first()
    if not bloqueo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bloqueo no encontrado")
    db.delete(bloqueo)
    db.commit()
