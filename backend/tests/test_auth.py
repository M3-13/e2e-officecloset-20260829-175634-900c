"""Tests for the auth slice: registration, login, bcrypt hashing and rate limiting.

Each test provisions its own SQLite database in ``tmp_path`` (never the dev file)
and clears the engine/session/settings caches plus the rate limiter so tests are
isolated from one another and from the shared ``main.app`` singleton.
"""

import pytest
from fastapi.testclient import TestClient

from app import main
from app.config import get_settings
from app.db import get_engine, get_session_factory
from app.models import User
from app.rate_limit import limiter


def _reset_backend() -> None:
    get_settings.cache_clear()
    get_engine.cache_clear()
    get_session_factory.cache_clear()
    limiter.reset()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    _reset_backend()
    with TestClient(main.app) as c:
        yield c
    _reset_backend()


def _register(
    client: TestClient, email: str = "alice@example.com", password: str = "secret123"
) -> None:
    response = client.post("/api/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201


def test_register_returns_user(client) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "alice@example.com"
    assert isinstance(body["id"], int)
    assert "password" not in body
    assert "hashed_password" not in body


def test_register_duplicate_email_conflicts(client) -> None:
    _register(client)
    response = client.post(
        "/api/auth/register",
        json={"email": "alice@example.com", "password": "another123"},
    )
    assert response.status_code == 409


def test_register_invalid_email_unprocessable(client) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "secret123"},
    )
    assert response.status_code == 422


def test_login_returns_bearer_token(client) -> None:
    _register(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_login_wrong_password_unauthorized(client) -> None:
    _register(client)
    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_login_unknown_email_unauthorized(client) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


def test_password_stored_as_bcrypt_hash(client) -> None:
    _register(client)
    session = get_session_factory()()
    try:
        user = session.query(User).filter(User.email == "alice@example.com").one()
        assert user.hashed_password != "secret123"
        assert user.hashed_password.startswith("$2b$")
    finally:
        session.close()


def test_login_rate_limited_after_5_failed_attempts(client) -> None:
    _register(client)
    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"email": "alice@example.com", "password": "wrong"},
        )
        assert response.status_code == 401

    response = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong"},
    )
    assert response.status_code == 429


def test_register_rate_limited(client) -> None:
    for i in range(5):
        response = client.post(
            "/api/auth/register",
            json={"email": f"user{i}@example.com", "password": "secret123"},
        )
        assert response.status_code == 201

    response = client.post(
        "/api/auth/register",
        json={"email": "one-more@example.com", "password": "secret123"},
    )
    assert response.status_code == 429
