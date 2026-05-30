"""add icono_color column to servicios

Revision ID: 008
Revises: 007
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('servicios', sa.Column('icono_color', sa.String(16), nullable=True))


def downgrade() -> None:
    op.drop_column('servicios', 'icono_color')
