"""change promociones.porcentaje_descuento from Numeric to Integer (whole-number percent)

Revision ID: 016
Revises: 015
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('promociones') as batch_op:
        batch_op.alter_column(
            'porcentaje_descuento',
            existing_type=sa.Numeric(5, 2),
            type_=sa.Integer(),
            existing_nullable=False,
            postgresql_using='porcentaje_descuento::integer',
        )


def downgrade() -> None:
    with op.batch_alter_table('promociones') as batch_op:
        batch_op.alter_column(
            'porcentaje_descuento',
            existing_type=sa.Integer(),
            type_=sa.Numeric(5, 2),
            existing_nullable=False,
        )
