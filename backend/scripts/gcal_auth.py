"""
One-time Google Calendar OAuth helper.

Runs the OAuth consent flow in your browser and prints the values you need to
put in .env (locally) and in Railway (production):

    GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_SECRET
    GOOGLE_REFRESH_TOKEN
    GOOGLE_CALENDAR_ID   (usually "primary", or a specific calendar id)

PREREQUISITES (do this once in Google Cloud Console):
  1. Create a project at https://console.cloud.google.com
  2. APIs & Services → Enable "Google Calendar API"
  3. APIs & Services → OAuth consent screen → External → add your Google
     account as a Test user (so the refresh token doesn't expire in 7 days,
     publish the app to "In production" once it works).
  4. APIs & Services → Credentials → Create credentials → OAuth client ID →
     Application type: "Desktop app". Download the JSON.

USAGE:
    cd backend
    pip install -r requirements.txt          # installs google-auth-oauthlib
    py scripts/gcal_auth.py path/to/client_secret.json

Then copy the printed values into backend/.env and run scripts/gcal_test.py.
"""
import sys
from pathlib import Path

_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def main() -> None:
    if len(sys.argv) != 2:
        print("Uso: py scripts/gcal_auth.py <ruta_al_client_secret.json>")
        raise SystemExit(1)

    secret_path = Path(sys.argv[1])
    if not secret_path.exists():
        print(f"No se encontró el archivo: {secret_path}")
        raise SystemExit(1)

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("Falta google-auth-oauthlib. Corre primero: pip install -r requirements.txt")
        raise SystemExit(1)

    flow = InstalledAppFlow.from_client_secrets_file(str(secret_path), _SCOPES)
    # Opens a browser; 'consent' + offline guarantees a refresh_token is returned.
    creds = flow.run_local_server(
        port=0,
        access_type="offline",
        prompt="consent",
    )

    print("\n" + "=" * 60)
    print("¡Autenticación exitosa! Copia estos valores a tu .env / Railway:")
    print("=" * 60)
    print(f"GOOGLE_CLIENT_ID={creds.client_id}")
    print(f"GOOGLE_CLIENT_SECRET={creds.client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print("GOOGLE_CALENDAR_ID=primary")
    print("=" * 60)
    print("\nLuego verifica con:  py scripts/gcal_test.py\n")


if __name__ == "__main__":
    main()
