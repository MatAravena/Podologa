from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Servicio
from schemas import ServicioCreate, ServicioOut, ServicioUpdate

router = APIRouter(prefix="/servicios", tags=["servicios"])


@router.get("", response_model=List[ServicioOut])
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(Servicio).order_by(Servicio.nombre).all()


@router.get("/{servicio_id}", response_model=ServicioOut)
def obtener_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(Servicio).filter(Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    return servicio


@router.post("", response_model=ServicioOut, status_code=status.HTTP_201_CREATED)
def crear_servicio(payload: ServicioCreate, db: Session = Depends(get_db)):
    servicio = Servicio(**payload.model_dump())
    db.add(servicio)
    db.commit()
    db.refresh(servicio)
    return servicio


@router.patch("/{servicio_id}", response_model=ServicioOut)
def actualizar_servicio(servicio_id: int, payload: ServicioUpdate, db: Session = Depends(get_db)):
    servicio = db.query(Servicio).filter(Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(servicio, field, value)
    db.commit()
    db.refresh(servicio)
    return servicio


@router.delete("/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(Servicio).filter(Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    db.delete(servicio)
    db.commit()
