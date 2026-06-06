"""add patient self-confirmation fields to citas

Lets the patient confirm/cancel attendance via a unique link (anti no-show):
  - confirm_token: unique token for the public confirmation page
  - paciente_confirmo: NULL = no respondió, True = asistirá, False = no asistirá
  - confirmacion_respondida_at: cuándo respondió
  - confirmacion_48h_enviada / confirmacion_24h_enviada: control de envíos

Revision ID: 015
Revises: 014
Create Date: 2026-06-06
"""
from alembic import op
import sqlalchemy as sa

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('citas', sa.Column('confirm_token', sa.String(64), nullable=True))
    op.add_column('citas', sa.Column('paciente_confirmo', sa.Boolean(), nullable=True))
    op.add_column('citas', sa.Column('confirmacion_respondida_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('citas', sa.Column('confirmacion_48h_enviada', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column('citas', sa.Column('confirmacion_24h_enviada', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index('ix_citas_confirm_token', 'citas', ['confirm_token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_citas_confirm_token', table_name='citas')
    op.drop_column('citas', 'confirmacion_24h_enviada')
    op.drop_column('citas', 'confirmacion_48h_enviada')
    op.drop_column('citas', 'confirmacion_respondida_at')
    op.drop_column('citas', 'paciente_confirmo')
    op.drop_column('citas', 'confirm_token')
