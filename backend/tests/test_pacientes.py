"""
Tests for the pacientes router (admin CRUD + clinical notes + portal token).

Covers:
  - POST/GET/PATCH/DELETE /admin/pacientes (+ auth, dup-email, search)
  - notes CRUD under a patient (+ 404s)
  - POST /admin/pacientes/{id}/generar-token (create + regenerate)
  - GET /pacientes/{token}/perfil (only visible notes, bad/expired token)
"""
from datetime import datetime, timedelta, timezone

import pytest

from models import NotaPaciente, Paciente


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture()
def paciente(db):
    p = Paciente(nombre="Ana Pérez", email="ana@example.cl", telefono="+56912345678")
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ── Auth ───────────────────────────────────────────────────────────────────────

def test_admin_endpoints_require_auth(client):
    assert client.get("/admin/pacientes").status_code == 401
    assert client.post("/admin/pacientes", json={"nombre": "X"}).status_code == 401
    assert client.get("/admin/pacientes/1").status_code == 401


# ── Create ─────────────────────────────────────────────────────────────────────

def test_crear_paciente(client, auth_headers):
    resp = client.post(
        "/admin/pacientes",
        json={"nombre": "Nueva Paciente", "email": "nueva@example.cl", "telefono": "+56911112222"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["nombre"] == "Nueva Paciente"
    assert body["id"] > 0


def test_crear_paciente_duplicate_email_409(client, auth_headers, paciente):
    resp = client.post(
        "/admin/pacientes",
        json={"nombre": "Otra", "email": paciente.email},
        headers=auth_headers,
    )
    assert resp.status_code == 409


# ── List + search ──────────────────────────────────────────────────────────────

def test_listar_pacientes(client, auth_headers, paciente):
    resp = client.get("/admin/pacientes", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_listar_pacientes_search_filters(client, auth_headers, db):
    db.add_all([
        Paciente(nombre="Carla Soto", email="carla@example.cl"),
        Paciente(nombre="Pedro Díaz", email="pedro@example.cl"),
    ])
    db.commit()

    resp = client.get("/admin/pacientes", params={"q": "carla"}, headers=auth_headers)
    assert resp.status_code == 200
    nombres = [p["nombre"] for p in resp.json()]
    assert nombres == ["Carla Soto"]


# ── Get / update / delete ──────────────────────────────────────────────────────

def test_obtener_paciente_200_and_404(client, auth_headers, paciente):
    assert client.get(f"/admin/pacientes/{paciente.id}", headers=auth_headers).status_code == 200
    assert client.get("/admin/pacientes/9999", headers=auth_headers).status_code == 404


def test_actualizar_paciente(client, auth_headers, paciente):
    resp = client.patch(
        f"/admin/pacientes/{paciente.id}",
        json={"telefono": "+56999998888"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["telefono"] == "+56999998888"


def test_actualizar_paciente_email_clash_409(client, auth_headers, db, paciente):
    other = Paciente(nombre="Otro", email="otro@example.cl")
    db.add(other)
    db.commit()
    db.refresh(other)

    resp = client.patch(
        f"/admin/pacientes/{other.id}",
        json={"email": paciente.email},
        headers=auth_headers,
    )
    assert resp.status_code == 409


def test_eliminar_paciente_cascades_notes(client, auth_headers, db, paciente):
    db.add(NotaPaciente(paciente_id=paciente.id, contenido="x", tipo="otro"))
    db.commit()

    resp = client.delete(f"/admin/pacientes/{paciente.id}", headers=auth_headers)
    assert resp.status_code == 204
    assert db.query(Paciente).count() == 0
    assert db.query(NotaPaciente).count() == 0


# ── Notes CRUD ─────────────────────────────────────────────────────────────────

def test_crear_nota(client, auth_headers, paciente):
    resp = client.post(
        f"/admin/pacientes/{paciente.id}/notas",
        json={"contenido": "Hidratar a diario", "tipo": "sugerencia", "visible_paciente": True},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["tipo"] == "sugerencia"
    assert body["visible_paciente"] is True


def test_crear_nota_paciente_inexistente_404(client, auth_headers):
    resp = client.post(
        "/admin/pacientes/9999/notas",
        json={"contenido": "x"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_crear_nota_tipo_invalido_422(client, auth_headers, paciente):
    resp = client.post(
        f"/admin/pacientes/{paciente.id}/notas",
        json={"contenido": "x", "tipo": "no_existe"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_actualizar_nota(client, auth_headers, db, paciente):
    nota = NotaPaciente(paciente_id=paciente.id, contenido="orig", tipo="otro", visible_paciente=False)
    db.add(nota)
    db.commit()
    db.refresh(nota)

    resp = client.patch(
        f"/admin/pacientes/{paciente.id}/notas/{nota.id}",
        json={"contenido": "editada", "visible_paciente": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["contenido"] == "editada"
    assert resp.json()["visible_paciente"] is True


def test_actualizar_nota_404(client, auth_headers, paciente):
    resp = client.patch(
        f"/admin/pacientes/{paciente.id}/notas/9999",
        json={"contenido": "x"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_eliminar_nota(client, auth_headers, db, paciente):
    nota = NotaPaciente(paciente_id=paciente.id, contenido="x", tipo="otro")
    db.add(nota)
    db.commit()
    db.refresh(nota)

    resp = client.delete(f"/admin/pacientes/{paciente.id}/notas/{nota.id}", headers=auth_headers)
    assert resp.status_code == 204
    assert db.query(NotaPaciente).count() == 0


# ── Portal token ───────────────────────────────────────────────────────────────

def test_generar_token_creates_and_regenerates(client, auth_headers, paciente):
    r1 = client.post(f"/admin/pacientes/{paciente.id}/generar-token", headers=auth_headers)
    assert r1.status_code == 200
    tok1 = r1.json()["access_token"]
    assert tok1

    r2 = client.post(f"/admin/pacientes/{paciente.id}/generar-token", headers=auth_headers)
    tok2 = r2.json()["access_token"]
    assert tok2 and tok2 != tok1


def test_portal_returns_only_visible_notes(client, db, paciente):
    paciente.access_token = "validtoken123"
    paciente.access_token_expira = datetime.now(timezone.utc) + timedelta(days=30)
    db.add_all([
        NotaPaciente(paciente_id=paciente.id, contenido="visible", tipo="sugerencia", visible_paciente=True),
        NotaPaciente(paciente_id=paciente.id, contenido="oculta", tipo="otro", visible_paciente=False),
    ])
    db.commit()

    resp = client.get(f"/pacientes/{paciente.access_token}/perfil")
    assert resp.status_code == 200
    body = resp.json()
    assert body["nombre"] == "Ana Pérez"
    contenidos = [n["contenido"] for n in body["notas_clinicas"]]
    assert contenidos == ["visible"]


def test_portal_bad_token_404(client):
    assert client.get("/pacientes/nope/perfil").status_code == 404


def test_portal_expired_token_404(client, db, paciente):
    paciente.access_token = "expiredtoken"
    paciente.access_token_expira = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()

    assert client.get(f"/pacientes/{paciente.access_token}/perfil").status_code == 404
