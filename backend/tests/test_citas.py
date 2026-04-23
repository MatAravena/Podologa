"""Tests for POST /citas and GET/PATCH /citas/{id}."""
from datetime import date, time, timedelta
from unittest.mock import patch

from models import Cita, EstadoCita, Paciente, Servicio


def _seed_servicio(db, nombre="Podología", duracion=60):
    s = Servicio(nombre=nombre, descripcion=None, duracion=duracion, precio="30000")
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def _future_date(days: int = 7) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


class TestCrearCita:
    def test_creates_cita_and_new_paciente(self, client, db):
        s = _seed_servicio(db)
        payload = {
            "nombre": "María",
            "apellido": "García",
            "email": "maria@test.cl",
            "telefono": "+56912345678",
            "servicio_id": s.id,
            "fecha": _future_date(),
            "hora": "10:00",
        }
        # Patch background tasks so Calendar/email don't fire
        with patch("routers.citas.send_confirmation"), \
             patch("routers.citas._sync_calendar_on_create"):
            resp = client.post("/citas", json=payload)

        assert resp.status_code == 201
        body = resp.json()
        assert body["estado"] == "pendiente"
        assert body["paciente"]["nombre"] == "María García"

        # Paciente should exist in DB
        assert db.query(Paciente).count() == 1

    def test_reuses_existing_paciente_by_email(self, client, db):
        s = _seed_servicio(db)
        paciente = Paciente(nombre="María García", email="maria@test.cl")
        db.add(paciente)
        db.commit()

        payload = {
            "nombre": "María",
            "apellido": "García",
            "email": "maria@test.cl",
            "telefono": "+56999999999",
            "servicio_id": s.id,
            "fecha": _future_date(),
            "hora": "11:00",
        }
        with patch("routers.citas.send_confirmation"), \
             patch("routers.citas._sync_calendar_on_create"):
            resp = client.post("/citas", json=payload)

        assert resp.status_code == 201
        # Should still be only 1 paciente, not 2
        assert db.query(Paciente).count() == 1

    def test_returns_404_for_missing_servicio(self, client):
        payload = {
            "nombre": "Test",
            "email": "test@test.cl",
            "servicio_id": 9999,
            "fecha": _future_date(),
            "hora": "10:00",
        }
        resp = client.post("/citas", json=payload)
        assert resp.status_code == 404

    def test_hora_must_match_pattern(self, client, db):
        s = _seed_servicio(db)
        payload = {
            "nombre": "Test",
            "email": "test@test.cl",
            "servicio_id": s.id,
            "fecha": _future_date(),
            "hora": "25:99",  # invalid
        }
        resp = client.post("/citas", json=payload)
        assert resp.status_code == 422


class TestObtenerCita:
    def test_returns_404_for_missing(self, client):
        resp = client.get("/citas/9999")
        assert resp.status_code == 404

    def test_returns_cita_by_id(self, client, db):
        s = _seed_servicio(db)
        p = Paciente(nombre="Test")
        db.add(p)
        db.commit()
        db.refresh(p)

        cita = Cita(
            fecha=date.today() + timedelta(days=3),
            hora=time(10, 0),
            duracion=60,
            estado=EstadoCita.PENDIENTE,
            paciente_id=p.id,
            servicio_id=s.id,
        )
        db.add(cita)
        db.commit()
        db.refresh(cita)

        resp = client.get(f"/citas/{cita.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == cita.id


class TestActualizarEstado:
    def test_can_cancel_cita(self, client, db):
        s = _seed_servicio(db)
        p = Paciente(nombre="Test")
        db.add(p)
        db.commit()
        db.refresh(p)

        cita = Cita(
            fecha=date.today() + timedelta(days=3),
            hora=time(10, 0),
            duracion=60,
            estado=EstadoCita.PENDIENTE,
            paciente_id=p.id,
            servicio_id=s.id,
        )
        db.add(cita)
        db.commit()
        db.refresh(cita)

        with patch("routers.citas.calendar_service"):
            resp = client.patch(
                f"/citas/{cita.id}/estado",
                json={"estado": "cancelada"},
            )
        assert resp.status_code == 200
        assert resp.json()["estado"] == "cancelada"

    def test_returns_404_for_missing_cita(self, client):
        resp = client.patch("/citas/9999/estado", json={"estado": "cancelada"})
        assert resp.status_code == 404
