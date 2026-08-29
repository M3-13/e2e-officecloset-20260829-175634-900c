"""Router stubs for the auth slice.

These routes are declared now so the shared HTTP contract is wired end-to-end,
and answer 501 Not Implemented until ticket #9 fills them in. Only the paths the
contract defines are registered here.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register() -> None:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


@router.post("/login", status_code=200)
def login() -> None:
    raise HTTPException(status_code=501, detail="auth #9 implements this")


@router.delete("/me", status_code=204)
def delete_me() -> None:
    raise HTTPException(status_code=501, detail="account deletion #1 implements this")
