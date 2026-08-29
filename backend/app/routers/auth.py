"""Authentication endpoints: register and login with per-client rate limiting.

``POST /api/auth/register`` validates the email (Pydantic ``EmailStr``), hashes
the password with bcrypt and answers 409 on a duplicate email. ``POST
/api/auth/login`` verifies the password and returns a bearer JWT, answering 401
for wrong credentials. Both are guarded by ``rate_limit.limiter`` and answer 429
once a client exceeds 5 attempts in a minute.

``DELETE /api/auth/me`` is kept as a 501 stub: account deletion is ticket #1's
slice, not this one.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.rate_limit import limiter
from app.schemas import LoginRequest, Token, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _client_key(request: Request) -> str:
    client = request.client
    return client.host if client is not None else "unknown"


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserOut)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)) -> User:
    if not limiter.is_allowed(_client_key(request), "register"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
        )

    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from None
    db.refresh(user)
    return user


@router.post("/login", status_code=status.HTTP_200_OK, response_model=Token)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Token:
    if not limiter.is_allowed(_client_key(request), "login"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Token(access_token=create_access_token(user.id), token_type="bearer")


@router.delete("/me", status_code=204)
def delete_me() -> None:
    raise HTTPException(status_code=501, detail="account deletion #1 implements this")
