"""add dynamic availability tables

Revision ID: 003
Revises: 002
Create Date: 2026-04-18

"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── bloques_disponibilidad ────────────────────────────────────────────────
    op.create_table(
        "bloques_disponibilidad",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("dia_semana", sa.Integer(), nullable=True),          # 0=Mon … 6=Sun
        sa.Column("fecha_especifica", sa.Date(), nullable=True),
        sa.Column("hora_inicio", sa.Time(), nullable=False),
        sa.Column("hora_fin", sa.Time(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "(dia_semana IS NOT NULL AND fecha_especifica IS NULL) OR "
            "(dia_semana IS NULL AND fecha_especifica IS NOT NULL)",
            name="ck_bloque_exactly_one_target",
        ),
        sa.CheckConstraint("dia_semana >= 0 AND dia_semana <= 6 OR dia_semana IS NULL",
                           name="ck_dia_semana_range"),
    )
    op.create_index("ix_bloques_disponibilidad_id", "bloques_disponibilidad", ["id"])
    op.create_index("ix_bloques_disponibilidad_dia", "bloques_disponibilidad", ["dia_semana"])
    op.create_index("ix_bloques_disponibilidad_fecha", "bloques_disponibilidad", ["fecha_especifica"])

    # Seed default weekly schedule (Mon–Fri 09:00–19:00, Sat 09:00–13:00)
    op.execute("""
        INSERT INTO bloques_disponibilidad (dia_semana, hora_inicio, hora_fin, activo)
        VALUES
          (0, '09:00', '19:00', true),
          (1, '09:00', '19:00', true),
          (2, '09:00', '19:00', true),
          (3, '09:00', '19:00', true),
          (4, '09:00', '19:00', true),
          (5, '09:00', '13:00', true)
    """)

    # ── fechas_bloqueo ────────────────────────────────────────────────────────
    op.create_table(
        "fechas_bloqueo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("motivo", sa.String(255), nullable=True),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fecha"),
    )
    op.create_index("ix_fechas_bloqueo_id", "fechas_bloqueo", ["id"])
    op.create_index("ix_fechas_bloqueo_fecha", "fechas_bloqueo", ["fecha"])


def downgrade() -> None:
    op.drop_table("fechas_bloqueo")
    op.drop_table("bloques_disponibilidad")
