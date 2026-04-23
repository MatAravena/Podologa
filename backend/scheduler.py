"""
Background scheduler for daily tasks.

Currently handles:
  - WhatsApp reminders sent ~24h before each confirmed appointment
  - Email reminders sent ~24h before each confirmed appointment

Uses APScheduler (add to requirements.txt).
Starts automatically when the FastAPI app starts.
"""
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from notifications.mailer import send_reminder
from models import Cita, EstadoCita
from whatsapp.cloud_api import send_text

scheduler = AsyncIOScheduler(timezone="America/Santiago")


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
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
