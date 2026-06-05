"""seed default data: real services (icons/colors) + default admin

Runs on every environment (incl. Railway) via `alembic upgrade head`.
Idempotent:
  - Services: UPDATE the 7 services by nombre to the current values, and INSERT
    any that are missing. Migration 001 already inserts the 7 names, so on a
    fresh DB this UPDATE corrects their precio/icono/icono_color; on an existing
    DB it backfills the NULL icono/icono_color columns added in 007/008.
  - Admin: INSERT a default admin ONLY if (a) SEED_ADMIN_PASSWORD env var is set
    AND (b) no admin user exists yet. If SEED_ADMIN_PASSWORD is empty the admin
    seed is skipped entirely (no insecure default — create it manually or via
    /auth/bootstrap). The password is hashed at runtime.

Revision ID: 014
Revises: 013
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa

revision = '014'
down_revision = '013'
branch_labels = None
depends_on = None


# (nombre, descripcion, duracion, precio, icono, icono_color)
SERVICIOS = [
    ("Podología",          "Diagnóstico y tratamiento integral del pie, uñas y piel. Cuidado profesional para tu bienestar y movilidad.",       45, 25000, "podologia",       "ciruela"),
    ("Reiki",              "Técnica de equilibrio energético que promueve la relajación profunda y la sanación natural del cuerpo y la mente.", 60, 20000, "reiki",            "verde_salvia"),
    ("Reflexología",       "Masaje terapéutico en puntos reflejos del pie que conectan con órganos y sistemas de todo el cuerpo.",              60, 20000, "reflexologia",     "verde_salvia"),
    ("Esencias Florales",  "Terapia floral de Bach para equilibrar estados emocionales y acompañar procesos de cambio interior.",               45, 18000, "aromaterapia",     "verde_salvia"),
    ("Auriculoterapia",    "Estimulación de puntos del pabellón auricular para tratar diversas condiciones de salud de forma natural.",         45, 18000, "auriculoterapia",  "ciruela"),
    ("Masajes Linfáticos", "Técnica suave que activa el sistema linfático, reduce la retención de líquidos y refuerza las defensas.",           60, 22000, "masaje",           "verde_salvia"),
    ("Tuina",              "Masaje terapéutico de la medicina tradicional china sobre meridianos y puntos de acupresión del cuerpo.",           60, 22000, "herramientas",     "dorado_mostaza"),
]

DISPONIBILIDAD = [
    (0, "09:00", "13:00"),
    (1, "09:00", "13:00"),
    (2, "09:00", "13:00"),
    (3, "09:00", "13:00"),
    (4, "09:00", "13:00"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # ── Servicios: upsert by nombre ──────────────────────────────────────────
    upd = sa.text(
        "UPDATE servicios SET descripcion=:d, duracion=:dur, precio=:p, "
        "icono=:ic, icono_color=:color WHERE nombre=:n"
    )
    ins = sa.text(
        "INSERT INTO servicios (nombre, descripcion, duracion, precio, icono, icono_color) "
        "VALUES (:n, :d, :dur, :p, :ic, :color)"
    )
    for nombre, desc, dur, precio, icono, color in SERVICIOS:
        params = {"n": nombre, "d": desc, "dur": dur, "p": precio, "ic": icono, "color": color}
        exists = conn.execute(
            sa.text("SELECT 1 FROM servicios WHERE nombre=:n"), {"n": nombre}
        ).first()
        conn.execute(upd if exists else ins, params)

    # ── Disponibilidad semanal (solo si la tabla está vacía) ─────────────────
    # Bound booleans (:t) keep this portable across SQLite and Postgres.
    has_blocks = conn.execute(
        sa.text("SELECT 1 FROM bloques_disponibilidad LIMIT 1")
    ).first()
    if not has_blocks:
        ins_blk = sa.text(
            "INSERT INTO bloques_disponibilidad (dia_semana, hora_inicio, hora_fin, activo) "
            "VALUES (:dia, :ini, :fin, :t)"
        )
        for dia, ini, fin in DISPONIBILIDAD:
            conn.execute(ins_blk, {"dia": dia, "ini": ini, "fin": fin, "t": True})

    # ── Admin por defecto (solo si no existe ningún admin Y hay password) ────
    # Si SEED_ADMIN_PASSWORD está vacía, NO se crea admin (sin fallback inseguro).
    # En ese caso, crear el admin manualmente en la DB o vía /auth/bootstrap.
    from config import settings

    if settings.SEED_ADMIN_PASSWORD:
        has_admin = conn.execute(
            sa.text("SELECT 1 FROM users WHERE is_admin = :t LIMIT 1"), {"t": True}
        ).first()
        if not has_admin:
            from auth import hash_password

            conn.execute(
                sa.text(
                    "INSERT INTO users (username, email, hashed_password, is_admin, is_active) "
                    "VALUES (:u, :e, :h, :t, :t)"
                ),
                {
                    "u": settings.SEED_ADMIN_USERNAME,
                    "e": settings.SEED_ADMIN_EMAIL,
                    "h": hash_password(settings.SEED_ADMIN_PASSWORD),
                    "t": True,
                },
            )


def downgrade() -> None:
    # Data-only migration — no schema change to revert.
    # We intentionally do NOT delete seeded rows on downgrade to avoid data loss.
    pass
