"""
Tests for the /galeria router (admin upload + caption + publish + delete).
Cloudinary and social-publish calls are mocked.
"""
from unittest.mock import patch

import pytest

from models import GaleriaPost


@pytest.fixture()
def post(db):
    p = GaleriaPost(
        titulo="Atención podológica",
        descripcion="Cuidado de tus pies",
        media_url="https://cdn/podologa/galeria/abc.jpg",
        media_type="image",
        published=False,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


# ── Auth ───────────────────────────────────────────────────────────────────────

def test_admin_actions_require_auth(client):
    assert client.post("/galeria/1/publicar").status_code == 401
    assert client.delete("/galeria/1").status_code == 401


# ── List ───────────────────────────────────────────────────────────────────────

def test_listar_posts(client, post):
    resp = client.get("/galeria")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["titulo"] == "Atención podológica"


# ── Create ─────────────────────────────────────────────────────────────────────

def test_crear_post_rejects_bad_type(client, auth_headers):
    resp = client.post(
        "/galeria",
        data={"titulo": "Nota"},
        files={"file": ("a.txt", b"hello", "text/plain")},
        headers=auth_headers,
    )
    assert resp.status_code == 415


def test_crear_post_ok(client, auth_headers, db):
    with patch("routers.galeria._upload_to_cloudinary", return_value=("https://cdn/x.jpg", "image")):
        resp = client.post(
            "/galeria",
            data={"titulo": "Nuevo post", "descripcion": "desc"},
            files={"file": ("x.jpg", b"\xff\xd8\xff", "image/jpeg")},
            headers=auth_headers,
        )
    assert resp.status_code == 201
    body = resp.json()
    assert body["titulo"] == "Nuevo post"
    assert body["published"] is False
    assert db.query(GaleriaPost).count() == 1


def test_crear_post_with_publicar_runs_social(client, auth_headers, db):
    with patch("routers.galeria._upload_to_cloudinary", return_value=("https://cdn/x.jpg", "image")), \
         patch("routers.galeria.publish_to_all_accounts", return_value=[
             {"platform": "facebook", "id": "fb1"},
             {"platform": "instagram", "id": "ig1"},
         ]) as pub:
        resp = client.post(
            "/galeria",
            data={"titulo": "Promo", "publicar": "true"},
            files={"file": ("x.jpg", b"\xff\xd8\xff", "image/jpeg")},
            headers=auth_headers,
        )
    assert resp.status_code == 201
    pub.assert_called_once()
    # background task marks it published with the returned IDs
    post = db.query(GaleriaPost).filter(GaleriaPost.titulo == "Promo").first()
    db.refresh(post)
    assert post.published is True
    assert post.fb_post_id == "fb1"
    assert post.ig_post_id == "ig1"


# ── Caption ────────────────────────────────────────────────────────────────────

def test_generar_caption(client, auth_headers, post):
    with patch("routers.galeria.generate_caption", return_value="Caption generada ✨"):
        resp = client.post(
            f"/galeria/{post.id}/generar-caption",
            json={"tono": "cálido"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    assert resp.json()["caption"] == "Caption generada ✨"


def test_generar_caption_404(client, auth_headers):
    resp = client.post("/galeria/9999/generar-caption", json={}, headers=auth_headers)
    assert resp.status_code == 404


# ── Publish ────────────────────────────────────────────────────────────────────

def test_publicar_post(client, auth_headers, post):
    with patch("routers.galeria.publish_to_all_accounts", return_value=[]) as pub:
        resp = client.post(f"/galeria/{post.id}/publicar", json={"caption": "Hola"}, headers=auth_headers)
    assert resp.status_code == 200
    pub.assert_called_once()


def test_publicar_post_404(client, auth_headers):
    resp = client.post("/galeria/9999/publicar", json={}, headers=auth_headers)
    assert resp.status_code == 404


# ── Delete ─────────────────────────────────────────────────────────────────────

def test_eliminar_post(client, auth_headers, db, post):
    with patch("routers.galeria._delete_from_cloudinary"):
        resp = client.delete(f"/galeria/{post.id}", headers=auth_headers)
    assert resp.status_code == 204
    assert db.query(GaleriaPost).count() == 0


def test_eliminar_post_404(client, auth_headers):
    assert client.delete("/galeria/9999", headers=auth_headers).status_code == 404
