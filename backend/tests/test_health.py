"""Tests for the backend skeleton's own deliverables: the health endpoint and
the fact that ``main.py`` imports every stub router module.

Deliberately narrow: we assert the health route answers what it promises and
that the stub modules are wired in, never what a stub returns today (that would
break the moment its owning ticket merges).
"""

from fastapi.testclient import TestClient

from app import main


def test_health_returns_ok() -> None:
    with TestClient(main.app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_main_imports_all_stub_modules() -> None:
    assert main.auth is not None
    assert main.wardrobe is not None
    assert main.outfits is not None


def test_stub_routers_are_registered() -> None:
    # Read the declared paths from the OpenAPI schema rather than the internal
    # ``app.routes`` list, whose entries are not all APIRoute objects across
    # Starlette/FastAPI versions (newer ones wrap included routers in an
    # ``_IncludedRouter`` that has no ``.path``).
    paths = set(main.app.openapi()["paths"].keys())
    assert "/api/auth/register" in paths
    assert "/api/auth/login" in paths
    assert "/api/auth/me" in paths
    assert "/api/wardrobe/items" in paths
    assert "/api/outfits" in paths
