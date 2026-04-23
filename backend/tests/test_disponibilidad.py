"""Tests for GET /disponibilidad and the _generate_slots helper."""
from datetime import date, time

import pytest

from models import BloqueDisponibilidad, Cita, EstadoCita, FechaBloqueo, Paciente, Servicio
from routers.disponibilidad import _generate_slots


# ── Unit tests for the slot generator (pure function, no DB) ──────────────────

class TestGenerateSlots:
    def test_one_hour_slots_in_nine_to_noon(self):
        slots = _generate_slots(time(9, 0), time(12, 0), 60)
        assert slots == ["09:00", "10:00", "11:00"]

    def test_last_slot_must_fit_before_fin(self):
        # 60-min slot starting at 18:00 would end at 19:00 → should be included
        # 60-min slot starting at 19:00 would end at 20:00 → should NOT be included
        slots = _generate_slots(time(9, 0), time(19, 0), 60)
        assert "18:00" in slots
        assert "19:00" not in slots

    def test_thirty_minute_slots(self):
        slots = _generate_slots(time(9, 0), time(10, 0), 30)
        assert slots == ["09:00", "09:30"]

    def test_empty_when_no_room_for_slot(self):
        # 60-min slot but only 30 minutes available
        slots = _generate_slots(time(9, 0), time(9, 30), 60)
        assert slots == []

    def test_single_slot_exactly_fits(self):
        slots = _generate_slots(time(14, 0), time(15, 0), 60)
        assert slots == ["14:00"]


# ── Integration tests using TestClient + DB ───────────────────────────────────

def _seed_servicio(db, duracion=60):
    s = Servicio(nombre="Podología", descripcion=None, duracion=duracion, precio="30000")
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(13, 0)):
    """Seed a weekly availability block. dia_semana=0 = Monday."""
    b = BloqueDisponibilidad(
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        activo=True,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


def _next_weekday(target_weekday: int) -> date:
    """Return the nearest upcoming date matching target_weekday (0=Mon … 6=Sun)."""
    today = date.today()
    delta = (target_weekday - today.weekday()) % 7
    if delta == 0:
        delta = 7  # force next week to avoid "today" edge cases
    return date(today.year, today.month, today.day).__class__.fromordinal(
        today.toordinal() + delta
    )


class TestObtenerDisponibilidad:
    def test_returns_empty_when_no_blocks(self, client):
        monday = _next_weekday(0)
        resp = client.get(f"/disponibilidad?fecha={monday}")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_slots_from_weekly_block(self, client, db):
        monday = _next_weekday(0)
        _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(11, 0))
        resp = client.get(f"/disponibilidad?fecha={monday}")
        assert resp.status_code == 200
        horas = [h["hora"] for h in resp.json()]
        assert "09:00" in horas
        assert "10:00" in horas

    def test_blocked_date_returns_empty(self, client, db):
        monday = _next_weekday(0)
        _seed_bloque(db, dia_semana=0)
        bloqueo = FechaBloqueo(fecha=monday, motivo="Feriado", activo=True)
        db.add(bloqueo)
        db.commit()

        resp = client.get(f"/disponibilidad?fecha={monday}")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_booked_slot_marked_unavailable(self, client, db):
        monday = _next_weekday(0)
        _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(12, 0))

        # Create paciente + cita at 09:00
        paciente = Paciente(nombre="Test User")
        db.add(paciente)
        db.commit()
        db.refresh(paciente)

        cita = Cita(
            fecha=monday,
            hora=time(9, 0),
            duracion=60,
            estado=EstadoCita.CONFIRMADA,
            paciente_id=paciente.id,
        )
        db.add(cita)
        db.commit()

        resp = client.get(f"/disponibilidad?fecha={monday}")
        slots = {h["hora"]: h["disponible"] for h in resp.json()}
        assert slots.get("09:00") is False
        assert slots.get("10:00") is True

    def test_cancelled_cita_does_not_block_slot(self, client, db):
        monday = _next_weekday(0)
        _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(11, 0))

        paciente = Paciente(nombre="Test User")
        db.add(paciente)
        db.commit()
        db.refresh(paciente)

        cita = Cita(
            fecha=monday,
            hora=time(9, 0),
            duracion=60,
            estado=EstadoCita.CANCELADA,
            paciente_id=paciente.id,
        )
        db.add(cita)
        db.commit()

        resp = client.get(f"/disponibilidad?fecha={monday}")
        slots = {h["hora"]: h["disponible"] for h in resp.json()}
        assert slots.get("09:00") is True

    def test_specific_date_block_overrides_weekly(self, client, db):
        monday = _next_weekday(0)
        # Weekly block: 9-13
        _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(13, 0))
        # Specific override: only 14-16
        override = BloqueDisponibilidad(
            fecha_especifica=monday,
            hora_inicio=time(14, 0),
            hora_fin=time(16, 0),
            activo=True,
        )
        db.add(override)
        db.commit()

        resp = client.get(f"/disponibilidad?fecha={monday}")
        horas = [h["hora"] for h in resp.json()]
        assert "09:00" not in horas  # weekly block should be ignored
        assert "14:00" in horas

    def test_uses_service_duration_for_slots(self, client, db):
        monday = _next_weekday(0)
        servicio = _seed_servicio(db, duracion=90)
        _seed_bloque(db, dia_semana=0, hora_inicio=time(9, 0), hora_fin=time(12, 0))

        resp = client.get(f"/disponibilidad?fecha={monday}&servicio_id={servicio.id}")
        horas = [h["hora"] for h in resp.json()]
        # 90-min slots: 09:00, 10:30 — 12:00 does NOT fit (would end at 13:30)
        assert "09:00" in horas
        assert "10:30" in horas
        assert "12:00" not in horas
