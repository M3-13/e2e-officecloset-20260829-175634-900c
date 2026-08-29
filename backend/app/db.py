"""SQLAlchemy engine, session factory and dependency for SQLite.

The engine and session factory are created lazily (cached) so importing this
module never opens a file or reads a URL it does not need yet. The schema is
created at startup by the app lifespan via ``Base.metadata.create_all``.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


@lru_cache
def get_engine() -> Engine:
    """Return the cached SQLAlchemy engine for the configured database URL."""
    settings = get_settings()
    url = settings.database_url
    connect_args: dict = {}
    if url.startswith("sqlite"):
        # SQLite is single-writer; allow the FastAPI thread pool to share one
        # connection without tripping its cross-thread check.
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return the cached session factory bound to the engine."""
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a session and closing it afterwards."""
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
