"""Password hashing and JWT helpers plus the current-user dependency.

Passwords are hashed with bcrypt (which produces the ``$2b$`` prefix required by
AC-09). JWTs carry ``sub`` (the user id) and ``exp`` (an integer Unix timestamp).
No email, token or password ever ends up in a log message here.
"""

from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User

ALGORITHM = "HS256"

# tokenUrl is only used to feed the OpenAPI docs; the real login route lives in
# the auth router stub until ticket #9 fills it in.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    """Return the bcrypt hash of ``password``."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when ``plain_password`` matches ``hashed_password``."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: int, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT for ``subject`` (a user id) with a ``sub``/``exp`` payload."""
    settings = get_settings()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    """Decode ``token`` and return its ``sub`` claim as an int.

    Raises ``jose.JWTError`` when the token is malformed, expired or signed with
    the wrong key.
    """
    settings = get_settings()
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    subject = payload.get("sub")
    if subject is None:
        raise JWTError("missing subject claim")
    return int(subject)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Resolve the bearer token to a user, answering 401 for any failure.

    Missing, malformed, expired or tampered tokens all answer the same 401 so no
    caller can tell them apart.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = decode_access_token(token)
    except (JWTError, ValueError):
        raise credentials_error from None

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error from None
    return user
