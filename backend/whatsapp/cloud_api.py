"""
Thin wrapper around the Meta WhatsApp Cloud API for sending messages.
Credentials come from config/whatsapp.json + .env.
"""
import httpx

from config import settings


def send_text(to_phone: str, text: str) -> dict:
    """
    Send a plain-text WhatsApp message to `to_phone` (E.164 format, no +).
    Returns the API response dict.
    """
    wa = settings.whatsapp_config
    version    = wa.get("api_version", "v19.0")
    phone_id   = settings.WHATSAPP_PHONE_NUMBER_ID
    api_token  = settings.WHATSAPP_API_TOKEN

    if not phone_id or not api_token:
        # Dev-mode: just log instead of hitting the real API
        print(f"[WhatsApp DEV] → {to_phone}: {text}")
        return {"status": "dev_mode"}

    url = f"https://graph.facebook.com/{version}/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    resp = httpx.post(url, json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()
