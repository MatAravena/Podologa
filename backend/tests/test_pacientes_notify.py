"""
Tests for the manual patient notification feature:
  - strict Chilean mobile validation
  - POST /admin/pacientes/{id}/notificar (per-channel results, auth, validation)
"""
from datetime import date

import pytest

from models import NotaPaciente, Paciente
from notifications.pacientes_notify import validar_movil_chileno


# ── Chilean mobile validation ──────────────────────────────────────────────────

@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+56 9 1234 5678", "56912345678"),
        ("56912345678", "56912345678"),
        ("912345678", "56912345678"),       # local mobile → prefixed
        ("+56-9-1234-5678", "56912345678"),
    ],
)
def test_validar_movil_valido(raw, expected):
    assert validar_movil_chileno(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        None,
        "",
        "123",                 # too short
        "221234567",           # landline-ish, not a 9-mobile
        "5621234567",          # not a mobile prefix
        "no-soy-numero",
        "+1 555 123 4567",     # not Chilean
    ],
)
def test_validar_movil_invalido(raw):
    assert validar_movil_chileno(raw) is None


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def paciente_con_notas(db):
    p = Paciente(nombre="Ana Pérez", email="ana@example.cl", telefono="+56 9 1234 5678")
    db.add(p)
    db.commit()
    db.refresh(p)
    db.add_all([
        NotaPaciente(paciente_id=p.id, contenido="Hidratar los pies a diario.",
                     tipo="sugerencia", visible_paciente=True),
        NotaPaciente(paciente_id=p.id, contenido="Nota interna no visible.",
                     tipo="seguimiento", visible_paciente=False),
    ])
    db.commit()
    return p


# ── Endpoint ───────────────────────────────────────────────────────────────────

def test_notificar_requiere_admin(client, paciente_con_notas):
    resp = client.post(
        f"/admin/pacientes/{paciente_con_notas.id}/notificar",
        json={"canales": ["email"]},
    )
    assert resp.status_code == 401


def test_notificar_paciente_inexistente(client, auth_headers):
    resp = client.post(
        "/admin/pacientes/9999/notificar",
        json={"canales": ["email"]},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_notificar_email_y_whatsapp_ok(client, auth_headers, paciente_con_notas):
    resp = client.post(
        f"/admin/pacientes/{paciente_con_notas.id}/notificar",
        json={"canales": ["email", "whatsapp"], "incluir_notas": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    resultados = resp.json()["resultados"]
    by_canal = {r["canal"]: r for r in resultados}
    assert by_canal["email"]["enviado"] is True
    assert by_canal["whatsapp"]["enviado"] is True


def test_notificar_whatsapp_numero_invalido(client, auth_headers, db):
    p = Paciente(nombre="Sin Fono", email="x@example.cl", telefono="123")
    db.add(p)
    db.commit()
    db.refresh(p)
    db.add(NotaPaciente(paciente_id=p.id, contenido="visible", tipo="otro", visible_paciente=True))
    db.commit()

    resp = client.post(
        f"/admin/pacientes/{p.id}/notificar",
        json={"canales": ["whatsapp"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    r = resp.json()["resultados"][0]
    assert r["canal"] == "whatsapp"
    assert r["enviado"] is False
    assert "inválido" in r["detalle"].lower() or "invalido" in r["detalle"].lower()


def test_notificar_email_sin_email_registrado(client, auth_headers, db):
    p = Paciente(nombre="Sin Mail", email=None, telefono="+56 9 1234 5678")
    db.add(p)
    db.commit()
    db.refresh(p)

    resp = client.post(
        f"/admin/pacientes/{p.id}/notificar",
        json={"canales": ["email"], "proxima_cita": "2026-07-01"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    r = resp.json()["resultados"][0]
    assert r["enviado"] is False


def test_notificar_nada_que_enviar_400(client, auth_headers, db):
    # Patient with no visible notes; incluir_notas True but nothing visible, no date
    p = Paciente(nombre="Vacío", email="v@example.cl", telefono="+56 9 1234 5678")
    db.add(p)
    db.commit()
    db.refresh(p)

    resp = client.post(
        f"/admin/pacientes/{p.id}/notificar",
        json={"canales": ["email"], "incluir_notas": True},
        headers=auth_headers,
    )
    assert resp.status_code == 400


def test_notificar_solo_proxima_cita_sin_notas(client, auth_headers, db):
    p = Paciente(nombre="Solo Fecha", email="f@example.cl", telefono="+56 9 1234 5678")
    db.add(p)
    db.commit()
    db.refresh(p)

    resp = client.post(
        f"/admin/pacientes/{p.id}/notificar",
        json={"canales": ["email"], "incluir_notas": False, "proxima_cita": "2026-07-15"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["resultados"][0]["enviado"] is True


def test_notificar_canal_invalido_422(client, auth_headers, paciente_con_notas):
    resp = client.post(
        f"/admin/pacientes/{paciente_con_notas.id}/notificar",
        json={"canales": ["telegram"]},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_notificar_canales_vacios_422(client, auth_headers, paciente_con_notas):
    resp = client.post(
        f"/admin/pacientes/{paciente_con_notas.id}/notificar",
        json={"canales": []},
        headers=auth_headers,
    )
    assert resp.status_code == 422
