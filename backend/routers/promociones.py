"""
Promociones router.

Public:
  GET /promociones/vigentes  — active promos for today (optionally filtered by service)

Admin (JWT required):
  GET    /promociones              — all promos (paginated)
  POST   /promociones              — create promo
  PATCH  /promociones/{id}         — update promo
  DELETE /promociones/{id}         — delete promo
"""
from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_admin
from database import get_db
from models import Promocion, User
from schemas import PromocionCreate, PromocionOut, PromocionUpdate

router = APIRouter(prefix="/promociones", tags=["promociones"])


def _is_currently_active(promo: Promocion) -> bool:
    """Return True if the promotion is active right now (date + optional hour window)."""
    today = date.today()
    if not (promo.fecha_inicio <= today <= promo.fecha_fin):
        return False
    if promo.hora_inicio is not None and promo.hora_fin is not None:
        now_time = datetime.now(timezone.utc).astimezone().time().replace(tzinfo=None)
        if not (promo.hora_inicio <= now_time <= promo.hora_fin):
            return False
    return True


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("/vigentes", response_model=List[PromocionOut])
def listar_vigentes(
    servicio_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Return all active promotions valid right now, optionally filtered by service."""
    today = date.today()
    query = db.query(Promocion).filter(
        Promocion.activo.is_(True),
        Promocion.fecha_inicio <= today,
        Promocion.fecha_fin >= today,
    )
    if servicio_id is not None:
        query = query.filter(Promocion.servicio_id == servicio_id)

    promos = query.order_by(Promocion.porcentaje_descuento.desc()).all()

    # Filter by current hour if promo has a time window
    return [p for p in promos if _is_currently_active(p)]


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[PromocionOut])
def listar_promociones(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    return db.query(Promocion).order_by(Promocion.fecha_inicio.desc()).all()


@router.post("", response_model=PromocionOut, status_code=status.HTTP_201_CREATED)
def crear_promocion(
    payload: PromocionCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    promo = Promocion(**payload.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.patch("/{promo_id}", response_model=PromocionOut)
def actualizar_promocion(
    promo_id: int,
    payload: PromocionUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    promo = db.query(Promocion).filter(Promocion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promoción no encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(promo, field, value)
    db.commit()
    db.refresh(promo)
    return promo


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_promocion(
    promo_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    promo = db.query(Promocion).filter(Promocion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promoción no encontrada")
    db.delete(promo)
    db.commit()
