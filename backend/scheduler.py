"""
Background scheduler for daily tasks.

Currently handles:
  - WhatsApp reminders sent ~24h before each confirmed appointment
  - Email reminders sent ~24h before each confirmed appointment

Uses APScheduler (add to requirements.txt).
Starts automatically when the FastAPI app starts.
"""
import secrets
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from notifications.citas_notify import send_confirmacion_request
from notifications.mailer import send_reminder
from models import Cita, EstadoCita
from whatsapp.cloud_api import send_text

scheduler = AsyncIOScheduler(timezone="America/Santiago")


def _send_confirmaciones() -> None:
    """Daily job (08:00): ask patients to confirm attendance.

    - 48h before: send the confirmation request once (any pending/confirmed cita).
    - 24h before: send a follow-up ONLY if the patient hasn't responded yet.
    Cancelled citas and those already answered are skipped.
    """
    today = date.today()
    en_48h = today + timedelta(days=2)
    en_24h = today + timedelta(days=1)

    db: Session = SessionLocal()
    try:
        candidatas = (
            db.query(Cita)
            .filter(
                Cita.fecha.in_([en_48h, en_24h]),
                Cita.estado != EstadoCita.CANCELADA,
            )
            .all()
        )

        for cita in candidatas:
            paciente = cita.paciente
            servicio = cita.servicio
            if not paciente or not servicio:
                continue
            # Patient already answered → nothing to ask.
            if cita.paciente_confirmo is not None:
                continue

            es_48h = cita.fecha == en_48h
            ya_enviada = cita.confirmacion_48h_enviada if es_48h else cita.confirmacion_24h_enviada
            if ya_enviada:
                continue
            # 24h follow-up only makes sense if the 48h request already went out.
            if not es_48h and not cita.confirmacion_48h_enviada:
                continue

            # Older citas may have no token yet — generate one on demand.
            if not cita.confirm_token:
                cita.confirm_token = secrets.token_urlsafe(32)

            send_confirmacion_request(
                email=paciente.email,
                telefono=paciente.telefono,
                nombre=paciente.nombre,
                servicio=servicio.nombre,
                fecha=cita.fecha.strftime("%d/%m/%Y"),
                hora=cita.hora.strftime("%H:%M"),
                token=cita.confirm_token,
                seguimiento=not es_48h,
            )

            if es_48h:
                cita.confirmacion_48h_enviada = True
            else:
                cita.confirmacion_24h_enviada = True
            db.commit()
    finally:
        db.close()


def _send_reminders() -> None:
    """Called every day at 10:00 — sends reminders for tomorrow's appointments."""
    tomorrow = date.today() + timedelta(days=1)
    db: Session = SessionLocal()
    try:
        citas = (
            db.query(Cita)
            .filter(
                Cita.fecha == tomorrow,
                Cita.estado == EstadoCita.CONFIRMADA,
            )
            .all()
        )

        for cita in citas:
            paciente = cita.paciente
            servicio = cita.servicio
            if not paciente or not servicio:
                continue

            fecha_str = cita.fecha.strftime("%d/%m/%Y")
            hora_str  = cita.hora.strftime("%H:%M")

            # WhatsApp reminder
            if paciente.telefono:
                phone = paciente.telefono.replace("+", "").replace(" ", "").replace("-", "")
                mensaje = (
                    f"Hola {paciente.nombre.split()[0]} 👋\n\n"
                    f"Te recordamos que mañana tienes una hora en Libélula Podología:\n\n"
                    f"📋 *{servicio.nombre}*\n"
                    f"📅 {fecha_str} a las {hora_str} hrs\n\n"
                    f"Si necesitas cancelar o reagendar, por favor avísanos con anticipación.\n"
                    f"¡Te esperamos! 🌿"
                )
                try:
                    send_text(phone, mensaje)
                except Exception as exc:  # noqa: BLE001
                    print(f"[Scheduler] WhatsApp reminder failed for cita {cita.id}: {exc}")

            # Email reminder
            if paciente.email:
                try:
                    send_reminder(
                        to_email=paciente.email,
                        nombre=paciente.nombre.split()[0],
                        servicio=servicio.nombre,
                        fecha=fecha_str,
                        hora=hora_str,
                    )
                except Exception as exc:  # noqa: BLE001
                    print(f"[Scheduler] Email reminder failed for cita {cita.id}: {exc}")

    finally:
        db.close()


def start_scheduler() -> None:
    """Register jobs and start the scheduler. Call once on app startup."""
    scheduler.add_job(
        _send_reminders,
        trigger="cron",
        hour=10,
        minute=0,
        id="daily_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        _send_confirmaciones,
        trigger="cron",
        hour=8,
        minute=0,
        id="daily_confirmaciones",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
