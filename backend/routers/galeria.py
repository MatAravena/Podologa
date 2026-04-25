import re
import uuid
from typing import List

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_admin
from config import settings
from database import get_db
from models import GaleriaPost, User
from schemas import GaleriaPostOut
from social.caption_generator import generate_caption
from social.meta import publish_to_all_accounts

router = APIRouter(prefix="/galeria", tags=["galeria"])

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime"}
MAX_FILE_MB   = 50


def _cloudinary_config() -> None:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _public_id_from_url(url: str) -> str:
    """Extract Cloudinary public_id (with folder, no extension) from a secure URL."""
    match = re.search(r"/upload/(?:v\d+/)?(.+)\.[^.]+$", url)
    return match.group(1) if match else url


class PublicarPayload(BaseModel):
    caption: str | None = None
    tono: str | None = None


class GenerarCaptionPayload(BaseModel):
    tono: str | None = None
    contexto_extra: str | None = None


class CaptionOut(BaseModel):
    caption: str
    ai_generated: bool


def _upload_to_cloudinary(file: UploadFile) -> tuple[str, str]:
    """Upload file to Cloudinary, return (secure_url, media_type)."""
    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE:
        media_type = "image"
        resource_type = "image"
    elif content_type in ALLOWED_VIDEO:
        media_type = "video"
        resource_type = "video"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Solo se permiten imágenes (jpg, png, webp) y videos (mp4, mov).",
        )

    # Read and check size before uploading
    data = file.file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Archivo demasiado grande (máx {MAX_FILE_MB} MB)",
        )

    _cloudinary_config()
    result = cloudinary.uploader.upload(
        data,
        folder="podologa/galeria",
        public_id=uuid.uuid4().hex,
        resource_type=resource_type,
        overwrite=False,
    )
    return result["secure_url"], media_type


def _delete_from_cloudinary(media_url: str, media_type: str) -> None:
    _cloudinary_config()
    public_id = _public_id_from_url(media_url)
    resource_type = "video" if media_type == "video" else "image"
    cloudinary.uploader.destroy(public_id, resource_type=resource_type, invalidate=True)


def _do_social_publish(post_id: int, media_url: str, caption: str, media_type: str, db: Session) -> None:
    """Background task: publish to social media and save post IDs."""
    results = publish_to_all_accounts(media_url, caption, media_type)  # type: ignore[arg-type]

    fb_id = next((r.get("id") for r in results if r.get("platform") == "facebook" and "id" in r), None)
    ig_id = next((r.get("id") for r in results if r.get("platform") == "instagram" and "id" in r), None)

    post = db.query(GaleriaPost).filter(GaleriaPost.id == post_id).first()
    if post:
        post.published = True
        if fb_id:
            post.fb_post_id = str(fb_id)
        if ig_id:
            post.ig_post_id = str(ig_id)
        db.commit()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[GaleriaPostOut])
def listar_posts(db: Session = Depends(get_db)):
    return db.query(GaleriaPost).order_by(GaleriaPost.created_at.desc()).all()


@router.post("", response_model=GaleriaPostOut, status_code=status.HTTP_201_CREATED)
def crear_post(
    background_tasks: BackgroundTasks,
    titulo: str      = Form(...),
    descripcion: str | None = Form(default=None),
    publicar: bool   = Form(default=False),
    file: UploadFile = File(...),
    db: Session      = Depends(get_db),
    _admin: User     = Depends(get_current_admin),
):
    media_url, media_type = _upload_to_cloudinary(file)

    post = GaleriaPost(
        titulo=titulo,
        descripcion=descripcion,
        media_url=media_url,
        media_type=media_type,
        published=False,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    if publicar:
        caption = titulo + (f"\n\n{descripcion}" if descripcion else "")
        background_tasks.add_task(
            _do_social_publish, post.id, media_url, caption, media_type, db
        )

    return post


@router.post("/{post_id}/generar-caption", response_model=CaptionOut)
def generar_caption_ia(
    post_id: int,
    payload: GenerarCaptionPayload,
    db: Session  = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    post = db.query(GaleriaPost).filter(GaleriaPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post no encontrado")

    ai_key_set = bool(settings.ANTHROPIC_API_KEY)
    caption = generate_caption(
        titulo=post.titulo,
        descripcion=post.descripcion,
        tono=payload.tono,
        contexto_extra=payload.contexto_extra,
    )
    return {"caption": caption, "ai_generated": ai_key_set}


@router.post("/{post_id}/publicar", response_model=GaleriaPostOut)
def publicar_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    payload: PublicarPayload = PublicarPayload(),
    db: Session  = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    post = db.query(GaleriaPost).filter(GaleriaPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post no encontrado")

    caption = payload.caption or (post.titulo + (f"\n\n{post.descripcion}" if post.descripcion else ""))
    background_tasks.add_task(
        _do_social_publish, post.id, post.media_url, caption, post.media_type, db
    )
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_post(
    post_id: int,
    db: Session  = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    post = db.query(GaleriaPost).filter(GaleriaPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post no encontrado")

    _delete_from_cloudinary(post.media_url, post.media_type)
    db.delete(post)
    db.commit()
