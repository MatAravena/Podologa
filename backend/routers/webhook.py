"""
POST /webhook/whatsapp  — incoming messages from Meta
GET  /webhook/whatsapp  — webhook verification challenge from Meta
"""
import hashlib
import hmac
import json

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request, status

from config import settings
from whatsapp.bot_engine import match_intent
from whatsapp.cloud_api import send_text

router = APIRouter(prefix="/webhook", tags=["webhook"])


# ── Verification challenge (Meta calls this once when you register the webhook) ──
@router.get("/whatsapp")
def verify_webhook(
    hub_mode: str       = Query(alias="hub.mode",       default=""),
    hub_challenge: str  = Query(alias="hub.challenge",  default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token de verificación inválido")


# ── Incoming message handler ──────────────────────────────────────────────────
def _verify_signature(body: bytes, x_hub_signature: str | None) -> bool:
    """Verify that the request actually comes from Meta."""
    if not x_hub_signature:
        return False
    expected = "sha256=" + hmac.new(
        settings.WHATSAPP_API_TOKEN.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, x_hub_signature)


def _handle_message(payload: dict) -> None:
    """Extract text message and send auto-reply."""
    try:
        entry   = payload["entry"][0]
        changes = entry["changes"][0]["value"]
        messages = changes.get("messages")
        if not messages:
            return

        msg  = messages[0]
        from_number = msg["from"]

        if msg.get("type") == "text":
            user_text = msg["text"]["body"]
        else:
            user_text = ""   # non-text messages get fallback response

        response_text = match_intent(user_text) if user_text else (
            settings.whatsapp_config.get("fallback_message", "Gracias por tu mensaje.")
        )
        send_text(from_number, response_text)

    except (KeyError, IndexError):
        pass  # malformed payload — ignore silently


@router.post("/whatsapp", status_code=status.HTTP_200_OK)
async def receive_message(request: Request, background_tasks: BackgroundTasks):
    body = await request.body()

    # Signature check (skip in dev if token is empty)
    if settings.WHATSAPP_API_TOKEN:
        sig = request.headers.get("X-Hub-Signature-256")
        if not _verify_signature(body, sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma inválida")

    payload = json.loads(body)
    # Run the reply in the background so Meta gets 200 immediately
    background_tasks.add_task(_handle_message, payload)
    return {"status": "ok"}
