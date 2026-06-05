"""change precio columns from Numeric to Integer (no decimals in Chilean pesos)

Revision ID: 013
Revises: 012
Create Date: 2026-06-04
"""
from alembic import op
import sqlalchemy as sa

revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('servicios') as batch_op:
        batch_op.alter_column(
            'precio',
            existing_type=sa.Numeric(10),
            type_=sa.Integer(),
            existing_nullable=False,
        )

    with op.batch_alter_table('citas') as batch_op:
        batch_op.alter_column(
            'precio_final',
            existing_type=sa.Numeric(10),
            type_=sa.Integer(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table('citas') as batch_op:
        batch_op.alter_column(
            'precio_final',
            existing_type=sa.Integer(),
            type_=sa.Numeric(10),
            existing_nullable=True,
        )

    with op.batch_alter_table('servicios') as batch_op:
        batch_op.alter_column(
            'precio',
            existing_type=sa.Integer(),
            type_=sa.Numeric(10),
            existing_nullable=False,
        )
