"""resize icono_color column from String(16) to String(32)

Now stores a brand color key name (e.g. 'dorado_mostaza') instead of a hex
value. 'dorado_mostaza' is 14 chars — String(16) is too tight for future
additions; String(32) gives comfortable room.

Revision ID: 009
Revises: 008
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'servicios',
        'icono_color',
        existing_type=sa.String(16),
        type_=sa.String(50),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'servicios',
        'icono_color',
        existing_type=sa.String(50),
        type_=sa.String(16),
        existing_nullable=True,
    )
