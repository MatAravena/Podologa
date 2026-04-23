import shutil
import uuid
from pathlib import Path
from typing import List

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


class PublicarPayload(BaseModel):
    caption: str | None = None       # admin-provided or AI-generated caption
    tono: str | None = None          # tone hint forwarded if re-generating


class GenerarCaptionPayload(BaseModel):
    tono: str | None = None
    contexto_extra: str | None = None


class CaptionOut(BaseModel):
    caption: str
    ai_generated: bool

UPLOADS_DIR = Path(__file__).parent.parent / "uploads" / "galeria"
ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime"}
MAX_FILE_MB   = 50


def _save_upload(file: UploadFile) -> tuple[str, str]:
    """Save the upload, return (relative_url, media_type)."""
    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE:
        media_type = "image"
        ext = content_type.split("/")[1]
    elif content_type in ALLOWED_VIDEO:
        media_type = "video"
        ext = "mp4"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Solo se permiten imágenes (jpg, png, webp) y videos (mp4, mov).",
        )

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOADS_DIR / filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Check size
    size_mb = dest.stat().st_size / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=f"Archivo demasiado grande (máx {MAX_FILE_MB} MB)")

    return f"/uploads/galeria/{filename}", media_type


def _do_social_publish(post_id: int, media_url: str, caption: str, media_type: str, db: Session) -> None:
    """Background task: publish to social media and save post IDs."""
    # Build a public URL (in production, replace with real domain)
    app_cfg = settings.app_config
    booking_link = app_cfg.get("booking_link", "")
    public_url = f"https://libelula.cl{media_url}"

    results = publish_to_all_accounts(public_url, caption, media_type)  # type: ignore[arg-type]

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
    titulo: str     = Form(...),
    descripcion: str | None = Form(default=None),
    publicar: bool  = Form(default=False),  # if True → post to social immediately
    file: UploadFile = File(...),
    db: Session     = Depends(get_db),
    _admin: User    = Depends(get_current_admin),
):
    media_url, media_type = _save_upload(file)

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
    """Generate (but do not publish) an AI-written caption for a gallery post."""
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
    """Publish a gallery post to social media. Accepts an optional pre-written caption."""
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
    # Remove file from disk
    path = Path(__file__).parent.parent / post.media_url.lstrip("/")
    path.unlink(missing_ok=True)
    db.delete(post)
    db.commit()
