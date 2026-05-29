import json
import re
from typing import List

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from auth import get_current_admin
from config import settings
from database import get_db
from models import Servicio, User
from schemas import ServicioCreate, ServicioOut, ServicioUpdate

router = APIRouter(prefix="/servicios", tags=["servicios"])

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_MB   = 10


def _cloudinary_config() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _public_id_from_url(url: str) -> str:
    match = re.search(r"/upload/(?:v\d+/)?(.+)\.[^.]+$", url)
    return match.group(1) if match else url


def _get_or_404(servicio_id: int, db: Session) -> Servicio:
    s = db.query(Servicio).filter(Servicio.id == servicio_id).first()
    if not s:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
    return s


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[ServicioOut])
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(Servicio).order_by(Servicio.nombre).all()


@router.get("/{servicio_id}", response_model=ServicioOut)
def obtener_servicio(servicio_id: int, db: Session = Depends(get_db)):
    return _get_or_404(servicio_id, db)


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.post("", response_model=ServicioOut, status_code=status.HTTP_201_CREATED)
def crear_servicio(
    payload: ServicioCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    servicio = Servicio(**payload.model_dump())
    db.add(servicio)
    db.commit()
    db.refresh(servicio)
    return servicio


@router.patch("/{servicio_id}", response_model=ServicioOut)
def actualizar_servicio(
    servicio_id: int,
    payload: ServicioUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    servicio = _get_or_404(servicio_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(servicio, field, value)
    db.commit()
    db.refresh(servicio)
    return servicio


@router.delete("/{servicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_servicio(
    servicio_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    servicio = _get_or_404(servicio_id, db)
    db.delete(servicio)
    db.commit()


@router.post("/{servicio_id}/fotos", response_model=ServicioOut)
def subir_foto(
    servicio_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    servicio = _get_or_404(servicio_id, db)

    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Solo se permiten imágenes jpg, png o webp.",
        )

    data = file.file.read()
    if len(data) / (1024 * 1024) > MAX_FILE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Imagen demasiado grande (máx {MAX_FILE_MB} MB).",
        )

    _cloudinary_config()
    result = cloudinary.uploader.upload(
        data,
        folder=f"servicios/{servicio_id}",
        resource_type="image",
    )
    url = result["secure_url"]

    urls: list = json.loads(servicio.fotos_urls) if servicio.fotos_urls else []
    urls.append(url)
    servicio.fotos_urls = json.dumps(urls)
    db.commit()
    db.refresh(servicio)
    return servicio


@router.delete("/{servicio_id}/fotos/{index}", response_model=ServicioOut)
def eliminar_foto(
    servicio_id: int,
    index: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    servicio = _get_or_404(servicio_id, db)
    urls: list = json.loads(servicio.fotos_urls) if servicio.fotos_urls else []

    if index < 0 or index >= len(urls):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Índice de foto inválido")

    url = urls[index]
    _cloudinary_config()
    try:
        cloudinary.uploader.destroy(_public_id_from_url(url))
    except Exception:
        pass  # don't block the delete if Cloudinary is unreachable

    urls.pop(index)
    servicio.fotos_urls = json.dumps(urls) if urls else None
    db.commit()
    db.refresh(servicio)
    return servicio
