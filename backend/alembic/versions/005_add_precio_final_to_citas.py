"""005_add_precio_final_to_citas

Adds precio_final and promocion_id columns to the citas table so that
when a booking is made during an active promotion the discounted price
and the promo that was applied are recorded permanently.

Revision ID: 005
Revises:     004
Create Date: 2026-04-18
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "citas",
        sa.Column("precio_final", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "citas",
        sa.Column(
            "promocion_id",
            sa.Integer,
            sa.ForeignKey("promociones.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("citas", "promocion_id")
    op.drop_column("citas", "precio_final")
