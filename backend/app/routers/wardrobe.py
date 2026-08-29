"""Wardrobe endpoints: list, create, get, update and delete clothing items and
serve their uploaded images.

Every route resolves the caller via ``get_current_user`` and scopes every query
and every file operation to that user's id, so a foreign item id answers 404
without leaking data (AC-10). Image uploads are size-checked against the
``Content-Length`` header before the body is buffered (AC-07); deleting an item
removes its row (cascading the ``OutfitItem`` links) and its image file (AC-06).
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.db import get_db
from app.models import ClothingItem, User
from app.schemas import CATEGORIES, ClothingItemOut
from app.security import get_current_user

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


def _check_upload_size(request: Request) -> None:
    """Dependency: refuse an oversized upload via ``Content-Length`` (AC-07).

    Runs before FastAPI parses the multipart body, so an oversized request is
    answered 413 without the body being buffered.
    """
    storage.check_content_length(request.headers.get("content-length"))


def _get_owned_item(db: Session, user_id: int, item_id: int) -> ClothingItem:
    """Return the item if it belongs to ``user_id``, else 404."""
    item = db.get(ClothingItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("/items", response_model=list[ClothingItemOut])
def list_items(
    category: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the caller's clothing items, optionally filtered by category."""
    query = select(ClothingItem).where(ClothingItem.user_id == current_user.id)
    if category is not None:
        query = query.where(ClothingItem.category == category)
    return db.scalars(query.order_by(ClothingItem.id)).all()


@router.post("/items", status_code=201, response_model=ClothingItemOut)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _size: None = Depends(_check_upload_size),
):
    """Create a clothing item with an uploaded image."""
    if category not in CATEGORIES:
        raise HTTPException(status_code=422, detail="Invalid category")

    item = ClothingItem(user_id=current_user.id, name=name, category=category, image_url="")
    db.add(item)
    db.flush()
    try:
        storage.save_image(current_user.id, image, item.id)
    except HTTPException:
        db.rollback()
        raise
    item.image_url = f"/api/wardrobe/items/{item.id}/image"
    db.commit()
    db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=ClothingItemOut)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return a single clothing item belonging to the caller."""
    return _get_owned_item(db, current_user.id, item_id)


@router.put("/items/{item_id}", response_model=ClothingItemOut)
def update_item(
    item_id: int,
    name: str | None = Form(None),
    category: str | None = Form(None),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _size: None = Depends(_check_upload_size),
):
    """Update a clothing item; every field is optional."""
    item = _get_owned_item(db, current_user.id, item_id)
    if name is not None:
        item.name = name
    if category is not None:
        if category not in CATEGORIES:
            raise HTTPException(status_code=422, detail="Invalid category")
        item.category = category
    if image is not None:
        try:
            storage.save_image(current_user.id, image, item.id)
        except HTTPException:
            db.rollback()
            raise
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an item, its outfit links (cascade) and its image file."""
    item = _get_owned_item(db, current_user.id, item_id)
    db.delete(item)
    db.commit()
    storage.delete_image(current_user.id, item_id)


@router.get("/items/{item_id}/image")
def get_item_image(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the uploaded image for an item."""
    _get_owned_item(db, current_user.id, item_id)
    return storage.serve_image(current_user.id, item_id)
