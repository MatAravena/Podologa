from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Text,
    Date,
    Time,
    DateTime,
    Numeric,
    ForeignKey,
    Enum,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    """Admin user — only used for backoffice access, not for patient accounts."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} admin={self.is_admin}>"


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class EstadoCita(PyEnum):
    PENDIENTE = "pendiente"
    CONFIRMADA = "confirmada"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class Paciente(TimestampMixin, Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    telefono = Column(String(20), nullable=True)
    notas = Column(Text, nullable=True)
    access_token = Column(String(64), unique=True, nullable=True, index=True)  # portal público paciente
    access_token_expira = Column(DateTime(timezone=True), nullable=True)        # caducidad del token de portal

    citas         = relationship("Cita", back_populates="paciente", cascade="all, delete-orphan")
    notas_clinicas = relationship("NotaPaciente", back_populates="paciente", cascade="all, delete-orphan",
                                  order_by="NotaPaciente.created_at.desc()")

    def __repr__(self) -> str:
        return f"<Paciente id={self.id} nombre={self.nombre!r}>"


class Servicio(TimestampMixin, Base):
    __tablename__ = "servicios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)           # short — shown on home cards
    subtitulo = Column(String(255), nullable=True)      # tagline for detail page
    descripcion_larga = Column(Text, nullable=True)     # full detail for /servicios/:id
    fotos_urls = Column(Text, nullable=True)            # JSON array of Cloudinary URLs
    icono       = Column(String(64), nullable=True)     # custom SVG icon name (e.g. 'podologia')
    icono_color = Column(String(50), nullable=True)     # brand color key name (e.g. 'verde_salvia'), resolved to hex in frontend
    duracion    = Column(Integer, nullable=False)       # en minutos
    precio      = Column(Integer, nullable=False)

    citas = relationship("Cita", back_populates="servicio")

    def __repr__(self) -> str:
        return f"<Servicio id={self.id} nombre={self.nombre!r} precio={self.precio}>"


class Cita(TimestampMixin, Base):
    __tablename__ = "citas"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    hora = Column(Time, nullable=False)
    duracion = Column(Integer, nullable=False)  # en minutos
    estado = Column(
        Enum(EstadoCita, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EstadoCita.PENDIENTE,
        index=True,
    )
    google_event_id = Column(String(255), unique=True, nullable=True)
    precio_final = Column(Integer, nullable=True)        # set when a promo discount is applied
    promocion_id = Column(Integer, ForeignKey("promociones.id", ondelete="SET NULL"), nullable=True, index=True)

    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="SET NULL"), nullable=True, index=True)

    paciente = relationship("Paciente", back_populates="citas")
    servicio = relationship("Servicio", back_populates="citas")

    def __repr__(self) -> str:
        return f"<Cita id={self.id} fecha={self.fecha} hora={self.hora} estado={self.estado.value}>"


class GaleriaPost(TimestampMixin, Base):
    """Photo or video posted by the admin. Published posts are auto-shared to social media."""
    __tablename__ = "galeria_posts"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    media_url = Column(Text, nullable=False)          # relative path under /uploads
    media_type = Column(String(10), nullable=False)   # 'image' | 'video'
    published = Column(Boolean, default=False, nullable=False)
    fb_post_id = Column(String(255), nullable=True)   # Facebook post ID after publish
    ig_post_id = Column(String(255), nullable=True)   # Instagram post ID after publish

    def __repr__(self) -> str:
        return f"<GaleriaPost id={self.id} titulo={self.titulo!r} published={self.published}>"


class BloqueDisponibilidad(Base):
    """
    Recurring weekly availability block (dia_semana set, fecha_especifica None)
    or a one-off availability block for a specific date (fecha_especifica set, dia_semana None).
    """
    __tablename__ = "bloques_disponibilidad"

    id = Column(Integer, primary_key=True, index=True)
    dia_semana = Column(Integer, nullable=True)          # 0=Mon … 6=Sun; None if specific date
    fecha_especifica = Column(Date, nullable=True)       # specific date override; None if weekly
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        target = f"dia={self.dia_semana}" if self.dia_semana is not None else f"fecha={self.fecha_especifica}"
        return f"<BloqueDisponibilidad id={self.id} {target} {self.hora_inicio}-{self.hora_fin}>"


class FechaBloqueo(Base):
    """A full day that is blocked (holiday, vacation, etc.)."""
    __tablename__ = "fechas_bloqueo"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, unique=True, index=True)
    motivo = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<FechaBloqueo id={self.id} fecha={self.fecha} motivo={self.motivo!r}>"


class Promocion(Base):
    """
    A time-limited discount on a service.
    Active when: fecha_inicio <= today <= fecha_fin
    AND hora_inicio <= now <= hora_fin (if hour range specified).
    """
    __tablename__ = "promociones"

    id = Column(Integer, primary_key=True, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="SET NULL"), nullable=True, index=True)  # None = applies to all services
    porcentaje_descuento = Column(Numeric(5), nullable=False)  # e.g. 20.00 = 20%
    descripcion = Column(String(500), nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=True)   # None = all day
    hora_fin = Column(Time, nullable=True)      # None = all day
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    servicio = relationship("Servicio")

    def __repr__(self) -> str:
        return f"<Promocion id={self.id} servicio_id={self.servicio_id} descuento={self.porcentaje_descuento}%>"


class Opinion(TimestampMixin, Base):
    __tablename__ = "opiniones"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    apellido = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    telefono = Column(String(20), nullable=True)
    foto_url = Column(Text, nullable=True)
    texto = Column(Text, nullable=False)
    puntuacion = Column(Numeric(2, 1), nullable=False)  # 0.5 – 5.0
    servicios_ids = Column(Text, nullable=True)  # JSON array stored as text

    def __repr__(self) -> str:
        return f"<Opinion id={self.id} nombre={self.nombre!r} puntuacion={self.puntuacion}>"


class NotaPaciente(Base):
    """Clinical note written by the podiatrist for a specific patient."""
    __tablename__ = "notas_paciente"

    id = Column(Integer, primary_key=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    cita_id     = Column(Integer, ForeignKey("citas.id",    ondelete="SET NULL"), nullable=True,  index=True)
    contenido   = Column(Text, nullable=False)
    tipo        = Column(String(20), nullable=False, default="seguimiento")
    # tipo values: seguimiento | sugerencia | recordatorio | otro
    visible_paciente = Column(Boolean, default=False, nullable=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    paciente = relationship("Paciente", back_populates="notas_clinicas")
    cita     = relationship("Cita")

    def __repr__(self) -> str:
        return f"<NotaPaciente id={self.id} paciente_id={self.paciente_id} tipo={self.tipo!r}>"
