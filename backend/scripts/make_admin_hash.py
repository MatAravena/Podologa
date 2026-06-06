"""
Generate a bcrypt hash for an admin password, to paste directly into the DB.

Usage:
    cd backend
    py scripts/make_admin_hash.py "MiPasswordSegura"

Then in the Railway Postgres console:

    INSERT INTO users (username, email, hashed_password, is_admin, is_active)
    VALUES ('admin', 'correo@dominio.cl', '<HASH>', true, true);

  -- or, if the user already exists, reset the password:
    UPDATE users SET hashed_password = '<HASH>' WHERE username = 'admin';
"""
import sys
from pathlib import Path

# Allow running from anywhere: add the backend root (parent of scripts/) to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from auth import hash_password  # noqa: E402


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        print('Uso: py scripts/make_admin_hash.py "TU_PASSWORD"')
        raise SystemExit(1)

    password = sys.argv[1]
    hashed = hash_password(password)

    print()
    print("Hash bcrypt (pégalo en la columna users.hashed_password):")
    print(hashed)
    print()
    print("Ejemplo SQL (crear):")
    print(
        "  INSERT INTO users (username, email, hashed_password, is_admin, is_active)\n"
        f"  VALUES ('admin', 'correo@dominio.cl', '{hashed}', true, true);"
    )
    print()
    print("Ejemplo SQL (resetear password de un usuario existente):")
    print(f"  UPDATE users SET hashed_password = '{hashed}' WHERE username = 'admin';")
    print()


if __name__ == "__main__":
    main()
