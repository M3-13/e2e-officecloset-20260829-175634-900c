"""Tests for the wardrobe slice: upload/serve, persistence across a restart,
category filtering, upload size limits, user isolation and item deletion.

Each test provisions its own database file and upload directory under pytest's
``tmp_path`` by clearing the cached settings/engine and re-pointing the
environment, so the suite is hermetic and runs in a fresh container.
"""

import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import get_settings
from app.db import get_engine, get_session_factory
from app.models import ClothingItem, Outfit, OutfitItem, User
from app.security import create_access_token, hash_password


@pytest.fixture()
def client(monkeypatch, tmp_path):
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "10000")

    with TestClient(main.app) as c:
        yield c

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()


def _create_user(email: str = "user@example.com") -> int:
    session = get_session_factory()()
    user = User(email=email, hashed_password=hash_password("password"))
    session.add(user)
    session.commit()
    session.refresh(user)
    user_id = user.id
    session.close()
    return user_id


def _auth(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id)}"}


def _upload(client: TestClient, user_id: int, name: str, category: str, content: bytes):
    files = {"image": ("img.png", content, "image/png")}
    return client.post(
        "/api/wardrobe/items",
        data={"name": name, "category": category},
        files=files,
        headers=_auth(user_id),
    )


def test_upload_then_serve_image(client) -> None:
    user_id = _create_user()
    response = _upload(client, user_id, "Shirt", "oberteil", b"fake-png-bytes")
    assert response.status_code == 201
    item = response.json()
    assert item["name"] == "Shirt"
    assert item["category"] == "oberteil"
    assert item["image_url"] == f"/api/wardrobe/items/{item['id']}/image"

    image = client.get(f"/api/wardrobe/items/{item['id']}/image", headers=_auth(user_id))
    assert image.status_code == 200
    assert image.content == b"fake-png-bytes"
    assert image.headers["content-type"].startswith("image/png")


def test_image_persists_across_restart(client) -> None:
    user_id = _create_user()
    response = _upload(client, user_id, "Shirt", "oberteil", b"persist-bytes")
    item_id = response.json()["id"]

    get_engine.cache_clear()
    get_session_factory.cache_clear()
    with TestClient(main.app) as restarted:
        image = restarted.get(f"/api/wardrobe/items/{item_id}/image", headers=_auth(user_id))
        assert image.status_code == 200
        assert image.content == b"persist-bytes"


def test_list_filters_by_category(client) -> None:
    user_id = _create_user()
    _upload(client, user_id, "Shirt", "oberteil", b"x")
    _upload(client, user_id, "Jeans", "hose", b"x")
    _upload(client, user_id, "Dress", "kleid", b"x")

    response = client.get(
        "/api/wardrobe/items", params={"category": "hose"}, headers=_auth(user_id)
    )
    assert response.status_code == 200
    assert [item["name"] for item in response.json()] == ["Jeans"]


def test_upload_too_large_returns_413(client) -> None:
    user_id = _create_user()
    response = _upload(client, user_id, "Big", "oberteil", b"x" * 20000)
    assert response.status_code == 413


def test_unsupported_content_type_rejected(client) -> None:
    user_id = _create_user()
    files = {"image": ("img.gif", b"GIF89a", "image/gif")}
    response = client.post(
        "/api/wardrobe/items",
        data={"name": "Shirt", "category": "oberteil"},
        files=files,
        headers=_auth(user_id),
    )
    assert response.status_code == 422


def test_users_see_only_their_own_items(client) -> None:
    user_a = _create_user("a@example.com")
    user_b = _create_user("b@example.com")
    _upload(client, user_a, "A-Shirt", "oberteil", b"x")
    _upload(client, user_b, "B-Shirt", "oberteil", b"x")

    assert [i["name"] for i in client.get("/api/wardrobe/items", headers=_auth(user_a)).json()] == [
        "A-Shirt"
    ]
    assert [i["name"] for i in client.get("/api/wardrobe/items", headers=_auth(user_b)).json()] == [
        "B-Shirt"
    ]


def test_foreign_item_id_returns_404(client) -> None:
    owner = _create_user("owner@example.com")
    intruder = _create_user("intruder@example.com")
    item_id = _upload(client, owner, "Shirt", "oberteil", b"x").json()["id"]

    assert client.get(f"/api/wardrobe/items/{item_id}", headers=_auth(intruder)).status_code == 404
    assert (
        client.get(f"/api/wardrobe/items/{item_id}/image", headers=_auth(intruder)).status_code
        == 404
    )
    assert (
        client.delete(f"/api/wardrobe/items/{item_id}", headers=_auth(intruder)).status_code == 404
    )

    files = {"image": ("img.png", b"y", "image/png")}
    update = client.put(
        f"/api/wardrobe/items/{item_id}",
        data={"name": "Hijack"},
        files=files,
        headers=_auth(intruder),
    )
    assert update.status_code == 404

    # The item is still owned by, and visible to, the real owner.
    assert client.get(f"/api/wardrobe/items/{item_id}", headers=_auth(owner)).status_code == 200


def test_delete_item_removes_row_image_and_outfit_links(client) -> None:
    user_id = _create_user()
    item_id = _upload(client, user_id, "Shirt", "oberteil", b"x").json()["id"]

    session = get_session_factory()()
    outfit = Outfit(user_id=user_id, name="Casual")
    session.add(outfit)
    session.flush()
    session.add(OutfitItem(outfit_id=outfit.id, item_id=item_id))
    session.commit()
    session.close()

    assert (
        client.delete(f"/api/wardrobe/items/{item_id}", headers=_auth(user_id)).status_code == 204
    )

    session = get_session_factory()()
    assert session.get(ClothingItem, item_id) is None
    assert session.query(OutfitItem).filter_by(item_id=item_id).count() == 0
    session.close()

    assert (
        client.get(f"/api/wardrobe/items/{item_id}/image", headers=_auth(user_id)).status_code
        == 404
    )
