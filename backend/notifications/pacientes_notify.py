"""
Manual patient notifications (admin-triggered, never automatic).

Sends a patient the summary of their visible clinical notes and/or a suggested
next-appointment date through the chosen channels (email / WhatsApp).

Unlike the appointment flow (`citas_notify`), this is **synchronous and returns a
per-channel result** so the admin gets immediate feedback like
"Email enviado ✓, WhatsApp falló — número inválido".
"""
from datetime import date

from notifications.mailer import send_nota_resumen
from whatsapp.cloud_api import send_text

# Human-readable labels for note types (mirrors the frontend TIPOS_NOTA).
TIPO_LABELS = {
    "seguimiento": "Seguimiento post-cita",
    "sugerencia": "Sugerencia de tratamiento",
    "recordatorio": "Recordatorio preventivo",
    "otro": "Nota",
}

_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def validar_movil_chileno(telefono: str | None) -> str | None:
    """Return the Chilean mobile in E.164 digits (``569XXXXXXXX``) if valid, else None.

    Accepts inputs like ``+56 9 1234 5678``, ``56912345678`` or the local
    ``912345678``. A valid Chilean mobile is country code 56 + a 9-digit number
    starting with 9.
    """
    if not telefono:
        return None
    digits = (
        telefono.replace("+", "").replace(" ", "").replace("-", "")
        .replace("(", "").replace(")", "")
    )
    if not digits.isdigit():
        return None
    # Local mobile '9XXXXXXXX' (9 digits) → prefix country code 56
    if len(digits) == 9 and digits.startswith("9"):
        digits = "56" + digits
    # Must be 56 + mobile prefix 9 + 8 digits = 11 digits total
    if len(digits) == 11 and digits.startswith("569"):
        return digits
    return None


def formatear_fecha(d: date) -> str:
    """Spanish long date without relying on system locale (Railway/Windows safe)."""
    return f"{_DIAS[d.weekday()]} {d.day} de {_MESES[d.month - 1]} de {d.year}"


def tipo_label(tipo: str) -> str:
    return TIPO_LABELS.get(tipo, TIPO_LABELS["otro"])


def _build_whatsapp_text(nombre: str, notas: list[tuple[str, str]], proxima: str | None) -> str:
    first = nombre.split()[0] if nombre else nombre
    lines = [f"¡Hola {first}! 🌿", "", "Te compartimos las indicaciones de tu podóloga en *Libélula*:"]
    if notas:
        lines.append("")
        for tipo, contenido in notas:
            lines.append(f"📋 *{tipo}*\n{contenido}")
    if proxima:
        lines.append("")
        lines.append(f"📅 Fecha sugerida para tu próxima hora: *{proxima}*")
    lines.append("")
    lines.append("Cualquier duda, respóndenos por aquí. 💗")
    return "\n".join(lines)


def notificar_resumen(
    *,
    email: str | None,
    telefono: str | None,
    nombre: str,
    notas: list[tuple[str, str]],
    proxima_cita: date | None,
    canales: list[str],
) -> list[dict]:
    """Send the summary through each requested channel and return per-channel results.

    `notas` is a list of (tipo_label, contenido) tuples — already filtered to the
    visible ones the admin chose to include (may be empty).
    Returns a list of ``{"canal", "enviado", "detalle"}`` dicts.
    """
    proxima_str = formatear_fecha(proxima_cita) if proxima_cita else None
    resultados: list[dict] = []

    for canal in canales:
        if canal == "email":
            if not email:
                resultados.append({
                    "canal": "email", "enviado": False,
                    "detalle": "El paciente no tiene email registrado.",
                })
                continue
            try:
                send_nota_resumen(email, nombre, notas, proxima_str)
                resultados.append({
                    "canal": "email", "enviado": True,
                    "detalle": f"Email enviado a {email}.",
                })
            except Exception as exc:  # noqa: BLE001
                resultados.append({
                    "canal": "email", "enviado": False,
                    "detalle": f"Falló el envío de email: {exc}",
                })

        elif canal == "whatsapp":
            phone = validar_movil_chileno(telefono)
            if not phone:
                resultados.append({
                    "canal": "whatsapp", "enviado": False,
                    "detalle": "Número de WhatsApp inválido o no registrado (debe ser un móvil chileno).",
                })
                continue
            try:
                send_text(phone, _build_whatsapp_text(nombre, notas, proxima_str))
                resultados.append({
                    "canal": "whatsapp", "enviado": True,
                    "detalle": "Mensaje de WhatsApp enviado.",
                })
            except Exception as exc:  # noqa: BLE001
                resultados.append({
                    "canal": "whatsapp", "enviado": False,
                    "detalle": f"Falló el envío de WhatsApp: {exc}",
                })

    return resultados
