import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_admin
from database import get_db
from models import Opinion, User
from schemas import OpinionCreate, OpinionOut, OpinionUpdate

router = APIRouter(prefix="/opiniones", tags=["opiniones"])


@router.get("", response_model=List[OpinionOut])
def listar_opiniones(db: Session = Depends(get_db)):
    return db.query(Opinion).order_by(Opinion.created_at.desc(), Opinion.id.desc()).all()


@router.post("", response_model=OpinionOut, status_code=status.HTTP_201_CREATED)
def crear_opinion(payload: OpinionCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    servicios_ids = data.pop("servicios_ids", [])
    opinion = Opinion(
        **data,
        servicios_ids=json.dumps(servicios_ids) if servicios_ids else None,
    )
    db.add(opinion)
    db.commit()
    db.refresh(opinion)
    return opinion


@router.patch("/{opinion_id}", response_model=OpinionOut)
def actualizar_opinion(
    opinion_id: int,
    payload: OpinionUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    opinion = db.query(Opinion).filter(Opinion.id == opinion_id).first()
    if not opinion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opinión no encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(opinion, field, value)
    db.commit()
    db.refresh(opinion)
    return opinion


@router.delete("/{opinion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_opinion(
    opinion_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),  # requires valid admin JWT
):
    opinion = db.query(Opinion).filter(Opinion.id == opinion_id).first()
    if not opinion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opinión no encontrada")
    db.delete(opinion)
    db.commit()
