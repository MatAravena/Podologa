"""make Promocion.servicio_id nullable to support global discounts

When servicio_id IS NULL the promotion applies to all services simultaneously.

Revision ID: 010
Revises: 009
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('promociones') as batch_op:
        batch_op.alter_column(
            'servicio_id',
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table('promociones') as batch_op:
        batch_op.alter_column(
            'servicio_id',
            existing_type=sa.Integer(),
            nullable=False,
        )
