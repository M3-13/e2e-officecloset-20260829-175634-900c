"""Router stubs for the outfits slice.

Declared now so the shared HTTP contract is wired end-to-end; each route answers
501 Not Implemented until ticket #5 fills them in. Only the contract paths are
registered.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.get("")
def list_outfits() -> None:
    raise HTTPException(status_code=501, detail="outfits #5 implements this")


@router.post("", status_code=201)
def create_outfit() -> None:
    raise HTTPException(status_code=501, detail="outfits #5 implements this")


@router.get("/{outfit_id}")
def get_outfit(outfit_id: int) -> None:
    raise HTTPException(status_code=501, detail="outfits #5 implements this")


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(outfit_id: int) -> None:
    raise HTTPException(status_code=501, detail="outfits #5 implements this")
