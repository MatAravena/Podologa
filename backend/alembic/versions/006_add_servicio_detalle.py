"""006_add_servicio_detalle

Adds subtitulo, descripcion_larga and fotos_urls columns to the servicios
table so each service can have a full detail page with rich content.

Revision ID: 006
Revises:     005
Create Date: 2026-05-29
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("servicios", sa.Column("subtitulo", sa.String(255), nullable=True))
    op.add_column("servicios", sa.Column("descripcion_larga", sa.Text, nullable=True))
    op.add_column("servicios", sa.Column("fotos_urls", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("servicios", "fotos_urls")
    op.drop_column("servicios", "descripcion_larga")
    op.drop_column("servicios", "subtitulo")
