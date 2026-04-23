"""004_add_promociones

Adds the `promociones` table for time-limited service discounts.

Revision ID: 004
Revises:     003
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "promociones",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column(
            "servicio_id",
            sa.Integer,
            sa.ForeignKey("servicios.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("porcentaje_descuento", sa.Numeric(5, 2), nullable=False),
        sa.Column("descripcion", sa.String(500), nullable=True),
        sa.Column("fecha_inicio", sa.Date, nullable=False),
        sa.Column("fecha_fin", sa.Date, nullable=False),
        sa.Column("hora_inicio", sa.Time, nullable=True),
        sa.Column("hora_fin", sa.Time, nullable=True),
        sa.Column("activo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "porcentaje_descuento > 0 AND porcentaje_descuento <= 100",
            name="ck_promo_descuento_range",
        ),
        sa.CheckConstraint(
            "fecha_fin >= fecha_inicio",
            name="ck_promo_fechas_order",
        ),
    )


def downgrade() -> None:
    op.drop_table("promociones")
