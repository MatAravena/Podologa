from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/config", tags=["config"])


class ContactoOut(BaseModel):
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    # Note: opening hours are NOT here — they come from the podologist's real
    # availability via GET /disponibilidad/semana (single source of truth).


@router.get("/contacto", response_model=ContactoOut)
def obtener_contacto() -> ContactoOut:
    """Public contact details, sourced from config/app.json (no secrets)."""
    cfg = settings.app_config
    contact = cfg.get("contact", {}) or {}
    return ContactoOut(
        phone=contact.get("phone"),
        email=contact.get("email"),
        address=contact.get("address"),
        instagram=contact.get("instagram"),
        facebook=contact.get("facebook"),
    )
