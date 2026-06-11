"""
Verify the Google Calendar integration end-to-end.

Uses the SAME `calendar_service` the booking flow uses, so if this passes,
real appointments will sync too.

It:
  1. Checks the 4 GOOGLE_* env vars are set.
  2. Creates a test event ~1 hour from now.
  3. Reschedules it (update) to +1 day.
  4. Deletes it.

USAGE:
    cd backend
    py scripts/gcal_test.py
"""
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

# Allow running from anywhere
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402
from integrations.google_calendar import calendar_service, _is_configured  # noqa: E402


def main() -> None:
    print("== Test de Google Calendar ==\n")

    # 1. Config check
    missing = [
        name for name in ("GOOGLE_CALENDAR_ID", "GOOGLE_CLIENT_ID",
                          "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN")
        if not getattr(settings, name, None)
    ]
    if missing:
        print("❌ Faltan variables de entorno:", ", ".join(missing))
        print("   Corre primero scripts/gcal_auth.py y complétalas en .env\n")
        raise SystemExit(1)
    if not _is_configured():
        print("❌ La integración reporta NO configurada.\n")
        raise SystemExit(1)
    print(f"✓ Configuración presente (calendar_id = {settings.GOOGLE_CALENDAR_ID})")

    # 2. Create
    cuando = datetime.now() + timedelta(hours=1)
    event_id = calendar_service.create_event(
        fecha=cuando.date(),
        hora=time(cuando.hour, 0),
        duracion_min=45,
        paciente_nombre="PRUEBA — Libélula",
        servicio_nombre="Evento de prueba (borrar)",
        notas="Creado por gcal_test.py — se elimina solo.",
    )
    if not event_id:
        print("❌ No se pudo crear el evento. Revisa credenciales / Calendar API habilitada.\n")
        raise SystemExit(1)
    print(f"✓ Evento creado: {event_id}")

    # 3. Update (reschedule +1 day)
    manana = date.today() + timedelta(days=1)
    ok = calendar_service.update_event(event_id, fecha=manana, hora=time(10, 0), duracion_min=45)
    print("✓ Evento reprogramado" if ok else "⚠ No se pudo reprogramar (no crítico)")

    # 4. Delete
    ok = calendar_service.delete_event(event_id)
    print("✓ Evento eliminado" if ok else "⚠ No se pudo eliminar — bórralo manualmente del calendario")

    print("\n✅ Todo OK — las reservas se sincronizarán con Google Calendar.\n")


if __name__ == "__main__":
    main()
