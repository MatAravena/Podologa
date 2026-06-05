"""add access_token_expira to pacientes (patient portal token expiry)

Revision ID: 012
Revises: 011
Create Date: 2026-06-01
"""
from alembic import op
import sqlalchemy as sa

revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('pacientes', sa.Column('access_token_expira', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('pacientes', 'access_token_expira')
