"""Router stubs for the wardrobe slice.

Declared now so the shared HTTP contract is wired end-to-end; each route answers
501 Not Implemented until ticket #6 fills them in. Only the contract paths are
registered.
"""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


@router.get("/items")
def list_items() -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")


@router.post("/items", status_code=201)
def create_item() -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")


@router.get("/items/{item_id}")
def get_item(item_id: int) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")


@router.put("/items/{item_id}")
def update_item(item_id: int) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")


@router.get("/items/{item_id}/image")
def get_item_image(item_id: int) -> None:
    raise HTTPException(status_code=501, detail="wardrobe #6 implements this")
