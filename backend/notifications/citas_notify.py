"""
Appointment notifications across both channels (email + WhatsApp).

Used by the booking endpoint (welcome message) and the scheduler
(48h confirmation request + 24h follow-up). Each function is best-effort:
failures in one channel never raise, so booking/scheduling never breaks.
"""
from config import settings
from notifications.mailer import send_confirmacion_request as _email_confirm_request
from whatsapp.cloud_api import send_text


def _clean_phone(telefono: str | None) -> str | None:
    """Normalize a Chilean phone to E.164 digits (no +) for the WhatsApp API."""
    if not telefono:
        return None
    digits = telefono.replace("+", "").replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not digits.isdigit():
        return None
    # Local mobile '9XXXXXXXX' (9 digits) → prefix country code 56
    if len(digits) == 9 and digits.startswith("9"):
        digits = "56" + digits
    return digits


def _confirm_url(token: str) -> str:
    return f"{settings.APP_URL}/confirmar/{token}"


# ── Welcome (on booking) ───────────────────────────────────────────────────────

def send_welcome(
    *, email: str | None, telefono: str | None,
    nombre: str, servicio: str, fecha: str, hora: str,
) -> None:
    """Thank-you message right after booking. No action required from the patient."""
    first = nombre.split()[0] if nombre else nombre

    if email:
        try:
            from notifications.mailer import send_confirmation
            send_confirmation(to_email=email, nombre=first, servicio=servicio, fecha=fecha, hora=hora)
        except Exception as exc:  # noqa: BLE001
            print(f"[notify] welcome email failed: {exc}")

    phone = _clean_phone(telefono)
    if phone:
        msg = (
            f"¡Hola {first}! 🌿\n\n"
            f"Gracias por agendar tu hora en *Libélula Podología y Terapias*.\n\n"
            f"📋 {servicio}\n"
            f"📅 {fecha} a las {hora} hrs\n\n"
            f"Te enviaremos un recordatorio para confirmar tu asistencia más cerca de la fecha. "
            f"¡Te esperamos!"
        )
        try:
            send_text(phone, msg)
        except Exception as exc:  # noqa: BLE001
            print(f"[notify] welcome whatsapp failed: {exc}")


# ── Confirmation request (48h before, and 24h follow-up) ───────────────────────

def send_confirmacion_request(
    *, email: str | None, telefono: str | None,
    nombre: str, servicio: str, fecha: str, hora: str, token: str,
    seguimiento: bool = False,
) -> None:
    """Ask the patient to confirm/cancel via the unique link. `seguimiento`
    softens the wording for the 24h follow-up (when they didn't respond yet)."""
    first = nombre.split()[0] if nombre else nombre
    url = _confirm_url(token)

    if email:
        try:
            _email_confirm_request(
                to_email=email, nombre=first, servicio=servicio,
                fecha=fecha, hora=hora, confirm_url=url,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[notify] confirm-request email failed: {exc}")

    phone = _clean_phone(telefono)
    if phone:
        intro = (
            f"Hola {first}, aún no recibimos tu confirmación 🙏"
            if seguimiento
            else f"¡Hola {first}! 👋"
        )
        msg = (
            f"{intro}\n\n"
            f"¿Nos confirmas tu hora en *Libélula*?\n\n"
            f"📋 {servicio}\n"
            f"📅 {fecha} a las {hora} hrs\n\n"
            f"Confirma o cancela aquí:\n{url}"
        )
        try:
            send_text(phone, msg)
        except Exception as exc:  # noqa: BLE001
            print(f"[notify] confirm-request whatsapp failed: {exc}")
