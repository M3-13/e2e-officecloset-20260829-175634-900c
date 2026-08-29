"""Authentication endpoints: register and login with per-client rate limiting.

``POST /api/auth/register`` validates the email (Pydantic ``EmailStr``), hashes
the password with bcrypt and answers 409 on a duplicate email. ``POST
/api/auth/login`` verifies the password and returns a bearer JWT, answering 401
for wrong credentials. Both are guarded by ``rate_limit.limiter`` and answer 429
once a client exceeds 5 attempts in a minute.

``DELETE /api/auth/me`` resolves the caller via ``get_current_user``, removes
every uploaded image file via ``storage.delete_all_images_for_user`` and deletes
the user row, whose cascade removes the associated clothing items, outfits and
outfit links (AC-14).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.models import User
from app.rate_limit import limiter
from app.schemas import LoginRequest, Token, UserCreate, UserOut
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

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
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete the caller's account and every piece of data that belongs to it.

    Removes the uploaded image files from disk first, then deletes the user row;
    the ORM cascade drops the associated clothing items, outfits and outfit links
    (AC-14). Answers 204 with no body.
    """
    user_id = current_user.id
    storage.delete_all_images_for_user(user_id)
    db.delete(current_user)
    db.commit()
