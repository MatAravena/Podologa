"""
Google Calendar integration for Libélula Podología.

Requires these environment variables (all optional — integration is skipped if absent):
  GOOGLE_CALENDAR_ID          e.g. "primary" or a specific calendar ID
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REFRESH_TOKEN        Obtained via OAuth2 consent flow (run scripts/gcal_auth.py once)

Usage:
  from integrations.google_calendar import calendar_service
  event_id = calendar_service.create_event(cita, paciente_nombre, servicio_nombre)
  calendar_service.update_event(event_id, cita)
  calendar_service.delete_event(event_id)
"""

import logging
from datetime import datetime, timedelta, date, time

from config import settings

log = logging.getLogger(__name__)

_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def _is_configured() -> bool:
    return all([
        getattr(settings, "GOOGLE_CALENDAR_ID", None),
        getattr(settings, "GOOGLE_CLIENT_ID", None),
        getattr(settings, "GOOGLE_CLIENT_SECRET", None),
        getattr(settings, "GOOGLE_REFRESH_TOKEN", None),
    ])


def _build_service():
    """Build a Google Calendar API service object using OAuth2 refresh token."""
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=settings.GOOGLE_REFRESH_TOKEN,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            token_uri="https://oauth2.googleapis.com/token",
            scopes=_SCOPES,
        )
        return build("calendar", "v3", credentials=creds, cache_discovery=False)
    except ImportError:
        log.warning("google-api-python-client not installed — Calendar integration disabled")
        return None
    except Exception as exc:
        log.error("Failed to build Google Calendar service: %s", exc)
        return None


def _dt_str(d: date, t: time) -> str:
    """Return RFC3339 datetime string in local time (no timezone info — Calendar uses calendarTimeZone)."""
    dt = datetime.combine(d, t)
    return dt.isoformat()


def _end_dt_str(d: date, t: time, duracion_min: int) -> str:
    dt = datetime.combine(d, t) + timedelta(minutes=duracion_min)
    return dt.isoformat()


class GoogleCalendarService:
    def __init__(self) -> None:
        self._calendar_id: str = getattr(settings, "GOOGLE_CALENDAR_ID", "primary")

    def create_event(
        self,
        fecha: date,
        hora: time,
        duracion_min: int,
        paciente_nombre: str,
        servicio_nombre: str,
        notas: str | None = None,
    ) -> str | None:
        """Create a calendar event. Returns the Google event ID or None on failure."""
        if not _is_configured():
            return None
        service = _build_service()
        if not service:
            return None
        try:
            body = {
                "summary": f"Cita — {paciente_nombre}",
                "description": f"Servicio: {servicio_nombre}" + (f"\nNotas: {notas}" if notas else ""),
                "start": {"dateTime": _dt_str(fecha, hora)},
                "end":   {"dateTime": _end_dt_str(fecha, hora, duracion_min)},
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 60},
                        {"method": "email", "minutes": 1440},  # 24h before
                    ],
                },
            }
            event = service.events().insert(calendarId=self._calendar_id, body=body).execute()
            log.info("Google Calendar event created: %s", event["id"])
            return event["id"]
        except Exception as exc:
            log.error("Failed to create calendar event: %s", exc)
            return None

    def update_event(
        self,
        event_id: str,
        fecha: date,
        hora: time,
        duracion_min: int,
    ) -> bool:
        """Reschedule an existing event. Returns True on success."""
        if not _is_configured() or not event_id:
            return False
        service = _build_service()
        if not service:
            return False
        try:
            event = service.events().get(calendarId=self._calendar_id, eventId=event_id).execute()
            event["start"] = {"dateTime": _dt_str(fecha, hora)}
            event["end"]   = {"dateTime": _end_dt_str(fecha, hora, duracion_min)}
            service.events().update(calendarId=self._calendar_id, eventId=event_id, body=event).execute()
            log.info("Google Calendar event updated: %s", event_id)
            return True
        except Exception as exc:
            log.error("Failed to update calendar event %s: %s", event_id, exc)
            return False

    def delete_event(self, event_id: str) -> bool:
        """Delete/cancel a calendar event. Returns True on success."""
        if not _is_configured() or not event_id:
            return False
        service = _build_service()
        if not service:
            return False
        try:
            service.events().delete(calendarId=self._calendar_id, eventId=event_id).execute()
            log.info("Google Calendar event deleted: %s", event_id)
            return True
        except Exception as exc:
            log.error("Failed to delete calendar event %s: %s", event_id, exc)
            return False


# Singleton — import this in routers
calendar_service = GoogleCalendarService()
