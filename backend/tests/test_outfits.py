"""Tests for the outfits slice.

Each test provisions its own users and clothing items in an isolated SQLite
database under ``tmp_path`` and drives the real FastAPI app through ``TestClient``.
Only the ``outfits`` tables this ticket owns are asserted against.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def env(tmp_path, monkeypatch):
    db_file = tmp_path / "test_outfits.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")

    from app.config import get_settings
    from app.db import get_engine, get_session_factory

    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()

    from app import main
    from app.db import Base
    from app.models import ClothingItem, Outfit, User
    from app.security import create_access_token

    Base.metadata.create_all(bind=get_engine())
    session_factory = get_session_factory()

    def make_user(email: str) -> int:
        session = session_factory()
        user = User(email=email, hashed_password="x")
        session.add(user)
        session.commit()
        user_id = user.id
        session.close()
        return user_id

    def add_item(user_id: int, name: str, category: str = "oberteil") -> int:
        session = session_factory()
        item = ClothingItem(
            user_id=user_id,
            name=name,
            category=category,
            image_url=f"/uploads/{name}.jpg",
        )
        session.add(item)
        session.commit()
        item_id = item.id
        session.close()
        return item_id

    def count_outfits(user_id: int) -> int:
        session = session_factory()
        count = session.query(Outfit).filter(Outfit.user_id == user_id).count()
        session.close()
        return count

    def count_items(user_id: int) -> int:
        session = session_factory()
        count = session.query(ClothingItem).filter(ClothingItem.user_id == user_id).count()
        session.close()
        return count

    class Env:
        client = TestClient(main.app)

    env = Env()
    env.make_user = make_user
    env.add_item = add_item
    env.count_outfits = count_outfits
    env.count_items = count_items
    env.token = lambda user_id: create_access_token(user_id)
    return env


def _auth_headers(env, user_id: int) -> dict:
    return {"Authorization": f"Bearer {env.token(user_id)}"}


def test_create_outfit_with_multiple_items(env) -> None:
    user_id = env.make_user("alice@example.com")
    item_ids = [
        env.add_item(user_id, "Bluse"),
        env.add_item(user_id, "Hose"),
        env.add_item(user_id, "Schuhe"),
    ]

    response = env.client.post(
        "/api/outfits",
        json={"name": "Abendlook", "item_ids": item_ids},
        headers=_auth_headers(env, user_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Abendlook"
    assert {item["id"] for item in body["items"]} == set(item_ids)
    assert len(body["items"]) == 3


def test_list_outfits_includes_name_and_image_of_each_item(env) -> None:
    user_id = env.make_user("alice@example.com")
    bluse = env.add_item(user_id, "Bluse")
    hose = env.add_item(user_id, "Hose")
    env.client.post(
        "/api/outfits",
        json={"name": "Büro", "item_ids": [bluse, hose]},
        headers=_auth_headers(env, user_id),
    )

    response = env.client.get("/api/outfits", headers=_auth_headers(env, user_id))

    assert response.status_code == 200
    outfits = response.json()
    assert len(outfits) == 1
    items = outfits[0]["items"]
    assert len(items) == 2
    for item in items:
        assert item["name"]
        assert item["image_url"]


def test_get_outfit_returns_single_outfit(env) -> None:
    user_id = env.make_user("alice@example.com")
    item_id = env.add_item(user_id, "Kleid")
    created = env.client.post(
        "/api/outfits",
        json={"name": "Party", "item_ids": [item_id]},
        headers=_auth_headers(env, user_id),
    ).json()

    response = env.client.get(f"/api/outfits/{created['id']}", headers=_auth_headers(env, user_id))

    assert response.status_code == 200
    assert response.json()["name"] == "Party"


def test_create_outfit_with_foreign_item_ids_returns_404(env) -> None:
    alice = env.make_user("alice@example.com")
    bob = env.make_user("bob@example.com")
    bobs_item = env.add_item(bob, "Bobs Jacke")

    response = env.client.post(
        "/api/outfits",
        json={"name": "Fremd", "item_ids": [bobs_item]},
        headers=_auth_headers(env, alice),
    )

    assert response.status_code == 404


def test_create_outfit_with_unknown_item_id_returns_404(env) -> None:
    alice = env.make_user("alice@example.com")

    response = env.client.post(
        "/api/outfits",
        json={"name": "Unbekannt", "item_ids": [999999]},
        headers=_auth_headers(env, alice),
    )

    assert response.status_code == 404


def test_get_foreign_outfit_returns_404(env) -> None:
    alice = env.make_user("alice@example.com")
    bob = env.make_user("bob@example.com")
    bob_item = env.add_item(bob, "Bobs Hemd")
    bobs_outfit = env.client.post(
        "/api/outfits",
        json={"name": "Bobs Outfit", "item_ids": [bob_item]},
        headers=_auth_headers(env, bob),
    ).json()

    response = env.client.get(
        f"/api/outfits/{bobs_outfit['id']}", headers=_auth_headers(env, alice)
    )

    assert response.status_code == 404


def test_delete_outfit_removes_outfit_but_not_items(env) -> None:
    user_id = env.make_user("alice@example.com")
    item_id = env.add_item(user_id, "Bluse")
    created = env.client.post(
        "/api/outfits",
        json={"name": "Weg damit", "item_ids": [item_id]},
        headers=_auth_headers(env, user_id),
    ).json()

    response = env.client.delete(
        f"/api/outfits/{created['id']}", headers=_auth_headers(env, user_id)
    )

    assert response.status_code == 204
    assert env.count_outfits(user_id) == 0
    assert env.count_items(user_id) == 1


def test_delete_foreign_outfit_returns_404(env) -> None:
    alice = env.make_user("alice@example.com")
    bob = env.make_user("bob@example.com")
    bob_item = env.add_item(bob, "Bobs Hemd")
    bobs_outfit = env.client.post(
        "/api/outfits",
        json={"name": "Bobs Outfit", "item_ids": [bob_item]},
        headers=_auth_headers(env, bob),
    ).json()

    response = env.client.delete(
        f"/api/outfits/{bobs_outfit['id']}", headers=_auth_headers(env, alice)
    )

    assert response.status_code == 404
    assert env.count_outfits(bob) == 1


def test_outfits_require_authentication(env) -> None:
    assert env.client.get("/api/outfits").status_code == 401
    assert env.client.post("/api/outfits", json={"name": "X", "item_ids": []}).status_code == 401
