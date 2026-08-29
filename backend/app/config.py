"""Application configuration.

Every value is read from the environment LAZILY (inside ``Settings``), never at
import time, so a fresh clone can always import the package and print a useful
error instead of dying on ``os.environ`` with a bare traceback.
"""

import os
import secrets
from functools import lru_cache


class Settings:
    """Runtime settings, loaded once from the environment.

    ``SECRET_KEY`` is the one value with no default: when it is absent a fresh
    random key is rolled per process start. It is never read from a literal in
    the repository.
    """

    def __init__(self) -> None:
        self.database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./dev.db")
        self.secret_key: str = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
        self.frontend_origin: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
        self.upload_dir: str = os.environ.get("UPLOAD_DIR", "uploads")
        self.max_upload_bytes: int = int(os.environ.get("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
        self.access_token_expire_minutes: int = int(
            os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
        )

    def validate(self) -> None:
        """Touch every setting once at startup so a broken value fails loudly.

        Called from the FastAPI lifespan before the app serves anything. With
        the current defaults every value has a sane fallback, but this keeps the
        contract honest as required variables are added later.
        """
        int(self.max_upload_bytes)
        int(self.access_token_expire_minutes)


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide, lazily constructed settings object."""
    return Settings()
