from datetime import date, time, timedelta, datetime
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import BloqueDisponibilidad, Cita, EstadoCita, FechaBloqueo, Servicio

router = APIRouter(prefix="/disponibilidad", tags=["disponibilidad"])


def _generate_slots(hora_inicio: time, hora_fin: time, duracion_min: int) -> List[str]:
    """Generate HH:MM slot strings from hora_inicio up to hora_fin - duracion."""
    slots: List[str] = []
    current = datetime.combine(date.today(), hora_inicio)
    end = datetime.combine(date.today(), hora_fin)
    delta = timedelta(minutes=duracion_min)
    while current + delta <= end:
        slots.append(current.strftime("%H:%M"))
        current += delta
    return slots


@router.get("", response_model=List[dict])
def obtener_disponibilidad(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    servicio_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    # 1. Check if the date is fully blocked
    bloqueo = db.query(FechaBloqueo).filter(
        FechaBloqueo.fecha == fecha,
        FechaBloqueo.activo.is_(True),
    ).first()
    if bloqueo:
        return []

    weekday = fecha.weekday()  # 0=Mon … 6=Sun

    # 2. Get active availability blocks for this date
    #    Priority: specific-date blocks override weekly blocks when present
    bloques_especificos = db.query(BloqueDisponibilidad).filter(
        BloqueDisponibilidad.fecha_especifica == fecha,
        BloqueDisponibilidad.activo.is_(True),
    ).order_by(BloqueDisponibilidad.hora_inicio).all()

    if bloques_especificos:
        bloques = bloques_especificos
    else:
        bloques = db.query(BloqueDisponibilidad).filter(
            BloqueDisponibilidad.dia_semana == weekday,
            BloqueDisponibilidad.activo.is_(True),
        ).order_by(BloqueDisponibilidad.hora_inicio).all()

    if not bloques:
        return []

    # 3. Determine slot duration from service, default 60 min
    duracion = 60
    if servicio_id:
        servicio = db.query(Servicio).filter(Servicio.id == servicio_id).first()
        if servicio:
            duracion = servicio.duracion

    # 4. Generate all slots across all blocks
    all_slots: List[str] = []
    for bloque in bloques:
        all_slots.extend(_generate_slots(bloque.hora_inicio, bloque.hora_fin, duracion))

    # 5. Remove duplicates while preserving order
    seen: set[str] = set()
    unique_slots: List[str] = []
    for s in all_slots:
        if s not in seen:
            seen.add(s)
            unique_slots.append(s)

    # 6. Cross-check against booked appointments
    ocupadas = {
        str(c.hora)[:5]
        for c in db.query(Cita).filter(
            Cita.fecha == fecha,
            Cita.estado != EstadoCita.CANCELADA,
        ).all()
    }

    return [
        {"hora": slot, "disponible": slot not in ocupadas}
        for slot in unique_slots
    ]
