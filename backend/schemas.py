from datetime import date, datetime, time
from decimal import Decimal
from typing import List

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from models import EstadoCita


# ─── Shared config ────────────────────────────────────────────────────────────

class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ─── Paciente ─────────────────────────────────────────────────────────────────

class PacienteCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=255)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    notas: str | None = None


class PacienteUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    notas: str | None = None


class PacienteOut(ORMBase):
    id: int
    nombre: str
    email: str | None
    telefono: str | None
    notas: str | None
    created_at: datetime
    updated_at: datetime


# ─── Servicio ─────────────────────────────────────────────────────────────────

class ServicioCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=255)
    descripcion: str | None = None
    duracion: int = Field(..., gt=0, description="Duración en minutos")
    precio: Decimal = Field(..., gt=0, decimal_places=2)


class ServicioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=255)
    descripcion: str | None = None
    subtitulo: str | None = Field(default=None, max_length=255)
    descripcion_larga: str | None = None
    duracion: int | None = Field(default=None, gt=0)
    precio: Decimal | None = Field(default=None, gt=0, decimal_places=2)


class ServicioOut(ORMBase):
    id: int
    nombre: str
    descripcion: str | None
    subtitulo: str | None
    descripcion_larga: str | None
    fotos_urls: str | None  # raw JSON array text
    duracion: int
    precio: Decimal
    created_at: datetime
    updated_at: datetime


# ─── Cita ─────────────────────────────────────────────────────────────────────

class CitaCreate(BaseModel):
    fecha: date
    hora: time
    duracion: int = Field(..., gt=0, description="Duración en minutos")
    estado: EstadoCita = EstadoCita.PENDIENTE
    paciente_id: int
    servicio_id: int | None = None
    google_event_id: str | None = None


class CitaUpdate(BaseModel):
    fecha: date | None = None
    hora: time | None = None
    duracion: int | None = Field(default=None, gt=0)
    estado: EstadoCita | None = None
    servicio_id: int | None = None
    google_event_id: str | None = None


class CitaOut(ORMBase):
    id: int
    fecha: date
    hora: time
    duracion: int
    estado: EstadoCita
    google_event_id: str | None
    precio_final: Decimal | None
    promocion_id: int | None
    paciente_id: int
    servicio_id: int | None
    paciente: PacienteOut
    servicio: ServicioOut | None
    created_at: datetime
    updated_at: datetime


# ─── GaleriaPost ──────────────────────────────────────────────────────────────

class GaleriaPostCreate(BaseModel):
    titulo: str = Field(..., min_length=2, max_length=255)
    descripcion: str | None = None
    media_type: str = Field(..., pattern=r"^(image|video)$")


class GaleriaPostOut(ORMBase):
    id: int
    titulo: str
    descripcion: str | None
    media_url: str
    media_type: str
    published: bool
    fb_post_id: str | None
    ig_post_id: str | None
    created_at: datetime
    updated_at: datetime


# ─── BloqueDisponibilidad ─────────────────────────────────────────────────────

class BloqueDisponibilidadCreate(BaseModel):
    dia_semana: int | None = Field(default=None, ge=0, le=6, description="0=Lunes … 6=Domingo")
    fecha_especifica: date | None = None
    hora_inicio: time
    hora_fin: time
    activo: bool = True

    @field_validator("hora_fin")
    @classmethod
    def hora_fin_after_inicio(cls, v: time, info) -> time:
        inicio = info.data.get("hora_inicio")
        if inicio and v <= inicio:
            raise ValueError("hora_fin debe ser posterior a hora_inicio")
        return v


class BloqueDisponibilidadUpdate(BaseModel):
    hora_inicio: time | None = None
    hora_fin: time | None = None
    activo: bool | None = None


class BloqueDisponibilidadOut(ORMBase):
    id: int
    dia_semana: int | None
    fecha_especifica: date | None
    hora_inicio: time
    hora_fin: time
    activo: bool
    created_at: datetime


# ─── FechaBloqueo ─────────────────────────────────────────────────────────────

class FechaBloqueoCreate(BaseModel):
    fecha: date
    motivo: str | None = Field(default=None, max_length=255)
    activo: bool = True


class FechaBloqueoOut(ORMBase):
    id: int
    fecha: date
    motivo: str | None
    activo: bool
    created_at: datetime


# ─── Promocion ────────────────────────────────────────────────────────────────

class PromocionCreate(BaseModel):
    servicio_id: int
    porcentaje_descuento: Decimal = Field(..., gt=Decimal("0"), le=Decimal("100"), decimal_places=2)
    descripcion: str | None = Field(default=None, max_length=500)
    fecha_inicio: date
    fecha_fin: date
    hora_inicio: time | None = None
    hora_fin: time | None = None
    activo: bool = True

    @field_validator("fecha_fin")
    @classmethod
    def fecha_fin_after_inicio(cls, v: date, info) -> date:
        inicio = info.data.get("fecha_inicio")
        if inicio and v < inicio:
            raise ValueError("fecha_fin debe ser igual o posterior a fecha_inicio")
        return v


class PromocionUpdate(BaseModel):
    porcentaje_descuento: Decimal | None = Field(default=None, gt=Decimal("0"), le=Decimal("100"), decimal_places=2)
    descripcion: str | None = Field(default=None, max_length=500)
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None
    activo: bool | None = None


class PromocionOut(ORMBase):
    id: int
    servicio_id: int
    porcentaje_descuento: Decimal
    descripcion: str | None
    fecha_inicio: date
    fecha_fin: date
    hora_inicio: time | None
    hora_fin: time | None
    activo: bool
    created_at: datetime
    servicio: ServicioOut


# ─── Opinion ──────────────────────────────────────────────────────────────────

class OpinionCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=255)
    apellido: str = Field(..., min_length=1, max_length=255)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=20)
    foto_url: str | None = None
    texto: str = Field(..., min_length=10, max_length=2000)
    puntuacion: Decimal = Field(..., ge=Decimal("0.5"), le=Decimal("5.0"))
    servicios_ids: List[int] = Field(default_factory=list)

    @field_validator("puntuacion")
    @classmethod
    def puntuacion_must_be_half_increment(cls, v: Decimal) -> Decimal:
        remainder = (v * 2) % 1
        if remainder != 0:
            raise ValueError("La puntuación debe ser múltiplo de 0.5")
        return v


class OpinionOut(ORMBase):
    id: int
    nombre: str
    apellido: str
    email: str | None
    telefono: str | None
    foto_url: str | None
    texto: str
    puntuacion: Decimal
    servicios_ids: str | None  # raw JSON text from DB
    created_at: datetime
    updated_at: datetime
