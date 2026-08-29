"""Tests for account deletion (AC-14).

Deleting an account removes the user row and — via cascade — their clothing
items, outfits and outfit links; the uploaded image files are removed from disk;
and the account can no longer authenticate. Each test provisions its own
database file and upload directory under pytest's ``tmp_path`` so the suite is
hermetic.
"""

import pytest
from fastapi.testclient import TestClient

from app import main, storage
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


def _upload(client: TestClient, user_id: int, name: str, category: str) -> int:
    files = {"image": ("img.png", b"fake-png-bytes", "image/png")}
    response = client.post(
        "/api/wardrobe/items",
        data={"name": name, "category": category},
        files=files,
        headers=_auth(user_id),
    )
    assert response.status_code == 201
    return response.json()["id"]


def _create_outfit(user_id: int, item_id: int) -> int:
    session = get_session_factory()()
    outfit = Outfit(user_id=user_id, name="Casual")
    session.add(outfit)
    session.flush()
    session.add(OutfitItem(outfit_id=outfit.id, item_id=item_id))
    session.commit()
    outfit_id = outfit.id
    session.close()
    return outfit_id


def test_delete_account_removes_wardrobe_outfits_and_images(client) -> None:
    user_id = _create_user()
    item_id = _upload(client, user_id, "Shirt", "oberteil")
    _create_outfit(user_id, item_id)

    # The image is stored on disk and served before deletion.
    assert storage.get_image_path(user_id, item_id) is not None
    assert (
        client.get(f"/api/wardrobe/items/{item_id}/image", headers=_auth(user_id)).status_code
        == 200
    )

    response = client.delete("/api/auth/me", headers=_auth(user_id))
    assert response.status_code == 204

    session = get_session_factory()()
    assert session.get(User, user_id) is None
    assert session.query(ClothingItem).filter_by(user_id=user_id).count() == 0
    assert session.query(Outfit).filter_by(user_id=user_id).count() == 0
    assert session.query(OutfitItem).filter_by(item_id=item_id).count() == 0
    session.close()

    # The per-user upload directory (and every image in it) is gone.
    assert not storage.user_dir(user_id).exists()


def test_deleted_account_can_no_longer_authenticate(client) -> None:
    user_id = _create_user()
    token = _auth(user_id)

    assert client.delete("/api/auth/me", headers=token).status_code == 204

    # The user no longer exists, so the old token answers 401 — the account is
    # gone and a subsequent login can no longer succeed.
    assert client.get("/api/wardrobe/items", headers=token).status_code == 401


def test_delete_account_requires_authentication(client) -> None:
    assert client.delete("/api/auth/me").status_code == 401
