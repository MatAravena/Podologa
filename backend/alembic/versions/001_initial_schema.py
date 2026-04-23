"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-03

"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pacientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("notas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_pacientes_id", "pacientes", ["id"])
    op.create_index("ix_pacientes_email", "pacientes", ["email"])

    op.create_table(
        "servicios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("duracion", sa.Integer(), nullable=False),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nombre"),
    )
    op.create_index("ix_servicios_id", "servicios", ["id"])

    op.create_table(
        "citas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("hora", sa.Time(), nullable=False),
        sa.Column("duracion", sa.Integer(), nullable=False),
        sa.Column(
            "estado",
            sa.Enum("pendiente", "confirmada", "completada", "cancelada", name="estadocita"),
            nullable=False,
        ),
        sa.Column("google_event_id", sa.String(255), nullable=True),
        sa.Column("paciente_id", sa.Integer(), nullable=False),
        sa.Column("servicio_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["servicio_id"], ["servicios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("google_event_id"),
    )
    op.create_index("ix_citas_id", "citas", ["id"])
    op.create_index("ix_citas_fecha", "citas", ["fecha"])
    op.create_index("ix_citas_estado", "citas", ["estado"])
    op.create_index("ix_citas_paciente_id", "citas", ["paciente_id"])
    op.create_index("ix_citas_servicio_id", "citas", ["servicio_id"])

    op.create_table(
        "opiniones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(255), nullable=False),
        sa.Column("apellido", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("foto_url", sa.Text(), nullable=True),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("puntuacion", sa.Numeric(2, 1), nullable=False),
        sa.Column("servicios_ids", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_opiniones_id", "opiniones", ["id"])

    # Seed initial services
    op.execute("""
        INSERT INTO servicios (nombre, descripcion, duracion, precio) VALUES
        ('Podología', 'Cuidado integral del pie', 60, 3500.00),
        ('Reiki', 'Terapia energética de sanación', 60, 2800.00),
        ('Reflexología', 'Masaje en puntos reflejos del pie', 45, 2500.00),
        ('Esencias Florales', 'Terapia con flores de Bach', 45, 2200.00),
        ('Auriculoterapia', 'Estimulación de puntos en el oído', 30, 2000.00),
        ('Masajes Linfáticos', 'Drenaje linfático manual', 60, 3200.00),
        ('Tuina', 'Masaje terapéutico chino', 60, 3000.00)
    """)


def downgrade() -> None:
    op.drop_table("opiniones")
    op.drop_table("citas")
    op.execute("DROP TYPE IF EXISTS estadocita")
    op.drop_table("servicios")
    op.drop_table("pacientes")
