"""
Unified settings loader.
- Env vars (.env) hold secrets (tokens, DB URL, keys).
- config/*.json files hold non-secret, easily editable configuration.
- Access everything through the `settings` singleton.
"""
import json
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).parent
CONFIG_DIR = BASE_DIR / "config"


def _load_json(filename: str) -> dict[str, Any]:
    path = CONFIG_DIR / filename
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours
    ALGORITHM: str = "HS256"
    PORTAL_TOKEN_EXPIRE_DAYS: int = 90  # patient portal link lifetime

    # ── Default admin (seeded by migration 014 if no admin exists) ────────────
    # Set these via env vars BEFORE first deploy. If SEED_ADMIN_PASSWORD is empty
    # the migration will SKIP creating the default admin (no insecure default).
    SEED_ADMIN_USERNAME: str = "admin"
    SEED_ADMIN_EMAIL: str = "admin@libelula.cl"
    SEED_ADMIN_PASSWORD: str = ""  # empty = do not seed an admin (no admin1234 fallback)

    # ── WhatsApp Cloud API ────────────────────────────────────────────────────
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""
    WHATSAPP_API_TOKEN: str = ""       # Bearer token for sending messages

    # ── Social — Facebook ─────────────────────────────────────────────────────
    FB_PAGE_ID: str = ""
    FB_PAGE_ACCESS_TOKEN: str = ""

    # ── Social — Instagram ────────────────────────────────────────────────────
    IG_BUSINESS_ACCOUNT_ID: str = ""
    IG_ACCESS_TOKEN: str = ""

    # ── Email / SMTP ──────────────────────────────────────────────────────────
    SMTP_HOST: str = ""           # leave empty to use dev/print mode
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "contacto@libelula.cl"

    # ── Google Calendar ───────────────────────────────────────────────────────
    GOOGLE_CALENDAR_ID: str = ""          # "primary" or specific calendar ID
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REFRESH_TOKEN: str = ""        # obtained via OAuth2 consent (run scripts/gcal_auth.py)

    # ── Cloudinary (media storage) ────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ── AI (Anthropic) ────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""    # leave empty to disable AI caption generation

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    APP_URL: str = "https://terapiaslibelula.cl"

    # Comma-separated extra origins added at runtime (e.g. the Vercel domain).
    # Example: CORS_EXTRA_ORIGINS=https://libelula.cl,https://www.libelula.cl
    CORS_EXTRA_ORIGINS: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── JSON config accessors (lazy-loaded once) ──────────────────────────────
    @property
    def app_config(self) -> dict[str, Any]:
        return _load_json("app.json")

    @property
    def whatsapp_config(self) -> dict[str, Any]:
        return _load_json("whatsapp.json")

    @property
    def whatsapp_responses(self) -> dict[str, Any]:
        return _load_json("whatsapp_responses.json")

    @property
    def social_accounts(self) -> dict[str, Any]:
        return _load_json("social_accounts.json")

    @property
    def cors_origins(self) -> list[str]:
        base = self.app_config.get("cors_origins", ["http://localhost:4200"])
        if self.CORS_EXTRA_ORIGINS:
            extra = [o.strip() for o in self.CORS_EXTRA_ORIGINS.split(",") if o.strip()]
            return base + extra
        return base


settings = Settings()
