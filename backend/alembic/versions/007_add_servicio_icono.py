"""add icono column to servicios

Revision ID: 007
Revises: 006
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('servicios', sa.Column('icono', sa.String(64), nullable=True))


def downgrade() -> None:
    op.drop_column('servicios', 'icono')
