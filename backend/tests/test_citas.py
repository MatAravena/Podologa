"""Tests for POST /citas and GET/PATCH /citas/{id}."""
from datetime import date, time, timedelta
from unittest.mock import patch

from models import Cita, EstadoCita, Paciente, Promocion, Servicio


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
        with patch("routers.citas.send_welcome"), \
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
        with patch("routers.citas.send_welcome"), \
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


def _seed_cita(db, servicio, *, confirm_token=None, fecha_offset=3):
    p = Paciente(nombre="Test Paciente", email="pac@test.cl", telefono="+56912345678")
    db.add(p)
    db.commit()
    db.refresh(p)
    cita = Cita(
        fecha=date.today() + timedelta(days=fecha_offset),
        hora=time(10, 0),
        duracion=60,
        estado=EstadoCita.PENDIENTE,
        paciente_id=p.id,
        servicio_id=servicio.id,
        confirm_token=confirm_token,
    )
    db.add(cita)
    db.commit()
    db.refresh(cita)
    return cita


class TestConfirmacion:
    def test_ver_confirmacion(self, client, db):
        s = _seed_servicio(db)
        cita = _seed_cita(db, s, confirm_token="tok-abc")

        resp = client.get("/citas/confirmar/tok-abc")
        assert resp.status_code == 200
        body = resp.json()
        assert body["servicio"] == s.nombre
        assert body["paciente_confirmo"] is None

    def test_ver_confirmacion_bad_token_404(self, client):
        assert client.get("/citas/confirmar/nope").status_code == 404

    def test_paciente_confirma_asistencia(self, client, db):
        s = _seed_servicio(db)
        cita = _seed_cita(db, s, confirm_token="tok-yes")

        resp = client.post("/citas/confirmar/tok-yes", json={"asistira": True})
        assert resp.status_code == 200
        assert resp.json()["paciente_confirmo"] is True

        db.refresh(cita)
        assert cita.estado == EstadoCita.CONFIRMADA
        assert cita.paciente_confirmo is True

    def test_paciente_cancela_borra_evento_calendar(self, client, db):
        s = _seed_servicio(db)
        cita = _seed_cita(db, s, confirm_token="tok-no")
        cita.google_event_id = "evt-123"
        db.commit()

        with patch("routers.citas.calendar_service") as cal:
            resp = client.post("/citas/confirmar/tok-no", json={"asistira": False})
            assert resp.status_code == 200
            cal.delete_event.assert_called_once_with("evt-123")

        db.refresh(cita)
        assert cita.estado == EstadoCita.CANCELADA
        assert cita.paciente_confirmo is False


class TestPrecioFinalConPromo:
    def test_precio_final_applies_active_promo(self, client, db):
        s = _seed_servicio(db)  # precio "30000"
        # 20% promo for this service, active now (booking applies service-specific promos)
        db.add(Promocion(
            servicio_id=s.id,
            porcentaje_descuento=20,
            fecha_inicio=date.today() - timedelta(days=1),
            fecha_fin=date.today() + timedelta(days=10),
            activo=True,
        ))
        db.commit()

        payload = {
            "nombre": "Promo",
            "apellido": "Cliente",
            "email": "promo@test.cl",
            "servicio_id": s.id,
            "fecha": _future_date(),
            "hora": "12:00",
        }
        with patch("routers.citas.send_welcome"), \
             patch("routers.citas._sync_calendar_on_create"):
            resp = client.post("/citas", json=payload)

        assert resp.status_code == 201
        # 30000 - 20% = 24000
        assert resp.json()["precio_final"] == 24000


class TestSyncCalendarOnCreate:
    def test_persists_event_id(self, db):
        from routers.citas import _sync_calendar_on_create
        from tests.conftest import TestingSessionLocal

        s = _seed_servicio(db)
        cita = _seed_cita(db, s)

        # The function opens its own SessionLocal(); point it at the test DB
        # (shared in-memory engine via StaticPool) and mock the Calendar call.
        with patch("database.SessionLocal", TestingSessionLocal), \
             patch("routers.citas.calendar_service") as cal:
            cal.create_event.return_value = "evt-persisted"
            _sync_calendar_on_create(
                cita_id=cita.id,
                fecha=cita.fecha,
                hora=cita.hora,
                duracion=cita.duracion,
                paciente_nombre="Test",
                servicio_nombre=s.nombre,
                notas=None,
            )

        db.expire_all()
        refreshed = db.query(Cita).filter(Cita.id == cita.id).first()
        assert refreshed.google_event_id == "evt-persisted"
