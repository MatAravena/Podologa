"""
Tests for the daily scheduler jobs:
  - _send_confirmaciones: 48h request + 24h follow-up, skip cancelled/answered
  - _send_reminders: next-day reminders for confirmed citas only

Both jobs open their own SessionLocal(); we point it at the shared in-memory
test DB and mock the actual senders.
"""
from datetime import date, time, timedelta
from unittest.mock import patch

import pytest

import scheduler
from models import Cita, EstadoCita, Paciente, Servicio
from tests.conftest import TestingSessionLocal


@pytest.fixture()
def servicio(db):
    s = Servicio(nombre="Podología", descripcion=None, duracion=60, precio=30000)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@pytest.fixture()
def paciente(db):
    p = Paciente(nombre="Ana Pérez", email="ana@example.cl", telefono="+56912345678")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _cita(db, servicio, paciente, *, dias, estado=EstadoCita.PENDIENTE, **kw):
    c = Cita(
        fecha=date.today() + timedelta(days=dias),
        hora=time(10, 0),
        duracion=60,
        estado=estado,
        paciente_id=paciente.id,
        servicio_id=servicio.id,
        **kw,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


class TestSendConfirmaciones:
    def test_sends_48h_request_and_sets_flag(self, db, servicio, paciente):
        cita = _cita(db, servicio, paciente, dias=2)  # 48h out

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_confirmacion_request") as send:
            scheduler._send_confirmaciones()

        send.assert_called_once()
        db.expire_all()
        refreshed = db.query(Cita).filter(Cita.id == cita.id).first()
        assert refreshed.confirmacion_48h_enviada is True
        assert refreshed.confirm_token  # generated on demand

    def test_skips_cancelled(self, db, servicio, paciente):
        _cita(db, servicio, paciente, dias=2, estado=EstadoCita.CANCELADA)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_confirmacion_request") as send:
            scheduler._send_confirmaciones()

        send.assert_not_called()

    def test_skips_already_answered(self, db, servicio, paciente):
        _cita(db, servicio, paciente, dias=2, paciente_confirmo=True)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_confirmacion_request") as send:
            scheduler._send_confirmaciones()

        send.assert_not_called()

    def test_24h_followup_only_after_48h_sent(self, db, servicio, paciente):
        # 24h out but 48h request never went out → no follow-up
        _cita(db, servicio, paciente, dias=1, confirmacion_48h_enviada=False)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_confirmacion_request") as send:
            scheduler._send_confirmaciones()

        send.assert_not_called()

    def test_24h_followup_sent_when_48h_already_sent(self, db, servicio, paciente):
        cita = _cita(db, servicio, paciente, dias=1, confirmacion_48h_enviada=True)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_confirmacion_request") as send:
            scheduler._send_confirmaciones()

        send.assert_called_once()
        db.expire_all()
        refreshed = db.query(Cita).filter(Cita.id == cita.id).first()
        assert refreshed.confirmacion_24h_enviada is True


class TestSendReminders:
    def test_reminds_confirmed_cita_tomorrow(self, db, servicio, paciente):
        _cita(db, servicio, paciente, dias=1, estado=EstadoCita.CONFIRMADA)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_text") as wa, \
             patch.object(scheduler, "send_reminder") as email:
            scheduler._send_reminders()

        wa.assert_called_once()
        email.assert_called_once()

    def test_does_not_remind_unconfirmed(self, db, servicio, paciente):
        _cita(db, servicio, paciente, dias=1, estado=EstadoCita.PENDIENTE)

        with patch.object(scheduler, "SessionLocal", TestingSessionLocal), \
             patch.object(scheduler, "send_text") as wa, \
             patch.object(scheduler, "send_reminder") as email:
            scheduler._send_reminders()

        wa.assert_not_called()
        email.assert_not_called()
