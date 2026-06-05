"""add access_token to pacientes + create notas_paciente table

Revision ID: 011
Revises: 010
Create Date: 2026-05-31
"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add access_token to pacientes
    op.add_column('pacientes', sa.Column('access_token', sa.String(64), nullable=True))
    op.create_index('ix_pacientes_access_token', 'pacientes', ['access_token'], unique=True)

    # Create notas_paciente table
    op.create_table(
        'notas_paciente',
        sa.Column('id',               sa.Integer(),     nullable=False),
        sa.Column('paciente_id',      sa.Integer(),     nullable=False),
        sa.Column('cita_id',          sa.Integer(),     nullable=True),
        sa.Column('contenido',        sa.Text(),        nullable=False),
        sa.Column('tipo',             sa.String(20),    nullable=False, server_default='seguimiento'),
        sa.Column('visible_paciente', sa.Boolean(),     nullable=False, server_default='0'),
        sa.Column('created_at',       sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at',       sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['paciente_id'], ['pacientes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['cita_id'],    ['citas.id'],     ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notas_paciente_id',          'notas_paciente', ['id'],          unique=False)
    op.create_index('ix_notas_paciente_paciente_id', 'notas_paciente', ['paciente_id'], unique=False)
    op.create_index('ix_notas_paciente_cita_id',     'notas_paciente', ['cita_id'],     unique=False)


def downgrade() -> None:
    op.drop_index('ix_notas_paciente_cita_id',     table_name='notas_paciente')
    op.drop_index('ix_notas_paciente_paciente_id', table_name='notas_paciente')
    op.drop_index('ix_notas_paciente_id',          table_name='notas_paciente')
    op.drop_table('notas_paciente')
    op.drop_index('ix_pacientes_access_token', table_name='pacientes')
    op.drop_column('pacientes', 'access_token')
