"""
Email service using SMTP (works with Gmail, Outlook, Mailgun SMTP, etc.).
Credentials come from .env via config.py.

In dev mode (SMTP_HOST is empty) emails are printed to stdout instead of sent.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings


def _build_confirmation_html(nombre: str, servicio: str, fecha: str, hora: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(200,140,160,.15);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#ffb6c1 0%,#ffd0d8 100%);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;font-size:1.625rem;font-weight:700;color:#2d1218;">🌿 Libélula</h1>
        <p style="margin:4px 0 0;font-size:.875rem;color:#7a3040;">Podología y Terapias</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 40px;">
        <h2 style="margin:0 0 8px;font-size:1.25rem;color:#2d2d2d;">¡Tu hora está solicitada, {nombre}!</h2>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;">
          Recibimos tu solicitud de hora. Te contactaremos pronto para confirmar la disponibilidad.
        </p>
        <!-- Summary box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:.875rem;width:40%;">Servicio</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{servicio}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:.875rem;">Fecha preferida</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{fecha}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9ca3af;font-size:.875rem;">Hora preferida</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{hora} hrs</td>
          </tr>
        </table>
        <p style="color:#6b7280;font-size:.875rem;line-height:1.6;margin:0 0 24px;">
          Si tienes alguna duda, puedes responder este correo o escribirnos por WhatsApp.
        </p>
        <a href="{settings.APP_URL}/reservas"
           style="display:inline-block;background:linear-gradient(135deg,#d4a017,#e8be4a);color:#ffffff;font-weight:600;font-size:.9375rem;padding:14px 32px;border-radius:50px;text-decoration:none;">
          Ver mis reservas
        </a>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px;border-top:1px solid #f3e8e8;text-align:center;color:#9ca3af;font-size:.75rem;">
        Santiago, Chile &nbsp;·&nbsp; +56 9 XXXX XXXX &nbsp;·&nbsp;
        <a href="{settings.APP_URL}" style="color:#d4697e;text-decoration:none;">libelula.cl</a>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def send_confirmation(to_email: str, nombre: str, servicio: str, fecha: str, hora: str) -> None:
    """
    Send booking confirmation email.
    In dev mode (SMTP_HOST empty) prints to stdout instead.
    """
    subject = f"Solicitud de hora recibida — {servicio}"
    html    = _build_confirmation_html(nombre, servicio, fecha, hora)

    if not settings.SMTP_HOST:
        print(f"\n[EMAIL DEV] To: {to_email}")
        print(f"  Subject: {subject}")
        print(f"  Servicio: {servicio} | Fecha: {fecha} | Hora: {hora}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Libélula Podología <{settings.SMTP_FROM}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())


def _send_html(to_email: str, subject: str, html: str, dev_label: str) -> None:
    """Shared SMTP send with dev-mode fallback."""
    if not settings.SMTP_HOST:
        print(f"\n[EMAIL DEV {dev_label}] To: {to_email} — {subject}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Libélula Podología <{settings.SMTP_FROM}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())


def send_confirmacion_request(
    to_email: str, nombre: str, servicio: str, fecha: str, hora: str, confirm_url: str
) -> None:
    """Email asking the patient to confirm or cancel attendance via two buttons."""
    subject = f"Confirma tu hora de {servicio} — Libélula"
    html = f"""
<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#fff5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(200,140,160,.15);">
    <tr><td style="background:linear-gradient(135deg,#ffb6c1 0%,#ffd0d8 100%);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;font-size:1.625rem;font-weight:700;color:#2d1218;">🌿 Libélula</h1>
      <p style="margin:4px 0 0;font-size:.875rem;color:#7a3040;">Podología y Terapias</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:1.25rem;color:#2d2d2d;">Hola {nombre}, ¿nos confirmas tu hora?</h2>
      <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;">
        Se acerca tu cita. Por favor confírmanos si podrás asistir para mantener tu hora reservada.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f5;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#9ca3af;font-size:.875rem;width:40%;">Servicio</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{servicio}</td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af;font-size:.875rem;">Fecha</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{fecha}</td></tr>
        <tr><td style="padding:6px 0;color:#9ca3af;font-size:.875rem;">Hora</td>
            <td style="padding:6px 0;color:#2d2d2d;font-weight:600;font-size:.875rem;">{hora} hrs</td></tr>
      </table>
      <div style="text-align:center;">
        <a href="{confirm_url}"
           style="display:inline-block;background:linear-gradient(135deg,#7dba7d,#4a8a4a);color:#fff;font-weight:600;font-size:.9375rem;padding:14px 28px;border-radius:50px;text-decoration:none;">
          Confirmar o cancelar mi hora
        </a>
      </div>
      <p style="color:#9ca3af;font-size:.8125rem;line-height:1.6;margin:24px 0 0;text-align:center;">
        Si el botón no funciona, copia este enlace:<br>{confirm_url}
      </p>
    </td></tr>
    <tr><td style="padding:20px 40px;border-top:1px solid #f3e8e8;text-align:center;color:#9ca3af;font-size:.75rem;">
      Santiago, Chile &nbsp;·&nbsp;
      <a href="{settings.APP_URL}" style="color:#d4697e;text-decoration:none;">libelula.cl</a>
    </td></tr>
  </table>
</body></html>
"""
    _send_html(to_email, subject, html, "CONFIRM-REQUEST")


def send_reminder(to_email: str, nombre: str, servicio: str, fecha: str, hora: str) -> None:
    """Send 24h-before reminder email."""
    subject = f"Recordatorio: tu hora de {servicio} es mañana"
    html = f"""
<!DOCTYPE html><html lang="es"><body style="font-family:Arial,sans-serif;background:#fff5f5;padding:40px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 40px;box-shadow:0 4px 20px rgba(200,140,160,.12);">
    <tr><td>
      <h2 style="color:#2d2d2d;margin:0 0 12px;">¡Hola, {nombre}! 👋</h2>
      <p style="color:#6b7280;line-height:1.6;">Te recordamos que mañana tienes una hora agendada:</p>
      <table style="background:#fff5f5;border-radius:10px;padding:16px 20px;margin:16px 0;width:100%;">
        <tr><td style="color:#9ca3af;font-size:.875rem;width:40%;">Servicio</td>
            <td style="color:#2d2d2d;font-weight:600;font-size:.875rem;">{servicio}</td></tr>
        <tr><td style="color:#9ca3af;font-size:.875rem;">Fecha</td>
            <td style="color:#2d2d2d;font-weight:600;font-size:.875rem;">{fecha}</td></tr>
        <tr><td style="color:#9ca3af;font-size:.875rem;">Hora</td>
            <td style="color:#2d2d2d;font-weight:600;font-size:.875rem;">{hora} hrs</td></tr>
      </table>
      <p style="color:#6b7280;font-size:.875rem;">Si necesitas cancelar o reagendar, por favor comunícate con anticipación.</p>
      <p style="color:#9ca3af;font-size:.75rem;margin-top:24px;">Libélula Podología y Terapias · Santiago, Chile</p>
    </td></tr>
  </table>
</body></html>
"""

    if not settings.SMTP_HOST:
        print(f"\n[EMAIL DEV REMINDER] To: {to_email} — {servicio} {fecha} {hora}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Libélula Podología <{settings.SMTP_FROM}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
