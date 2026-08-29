"""Outfit endpoints.

Implemented per the sprint's HTTP contract. Every answer is filtered strictly
by the authenticated user's id (AC-10): an outfit or a clothing item that
belongs to another user answers 404 with no data. Deleting an outfit removes
only the ``Outfit`` row and its ``OutfitItem`` links, never the ``ClothingItem``
rows (AC-06).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.models import ClothingItem, Outfit, OutfitItem, User
from app.schemas import ClothingItemOut, OutfitCreate, OutfitOut
from app.security import get_current_user

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _serialize_outfit(outfit: Outfit) -> OutfitOut:
    """Build an ``OutfitOut`` from an ORM ``Outfit`` whose links are loaded."""
    items = [ClothingItemOut.model_validate(link.item) for link in outfit.outfit_items]
    return OutfitOut(id=outfit.id, name=outfit.name, items=items)


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutfitOut]:
    """List the authenticated user's outfits, each with its clothing items."""
    outfits = (
        db.query(Outfit)
        .options(selectinload(Outfit.outfit_items).selectinload(OutfitItem.item))
        .filter(Outfit.user_id == user.id)
        .all()
    )
    return [_serialize_outfit(outfit) for outfit in outfits]


@router.post("", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(
    payload: OutfitCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    """Create an outfit from the given item ids, validating ownership.

    Every item id must belong to the authenticated user; an id that is unknown
    or owned by someone else answers 404 (AC-10).
    """
    item_ids = list(dict.fromkeys(payload.item_ids))
    by_id: dict[int, ClothingItem] = {}
    if item_ids:
        found = db.query(ClothingItem).filter(ClothingItem.id.in_(item_ids)).all()
        by_id = {item.id: item for item in found}
        for item_id in item_ids:
            item = by_id.get(item_id)
            if item is None or item.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Outfit item not found"
                )

    name = payload.name
    items_out = [ClothingItemOut.model_validate(by_id[iid]) for iid in item_ids]

    outfit = Outfit(user_id=user.id, name=name)
    db.add(outfit)
    db.flush()
    outfit_id = outfit.id
    for item_id in item_ids:
        db.add(OutfitItem(outfit_id=outfit_id, item_id=item_id))
    db.commit()

    return OutfitOut(id=outfit_id, name=name, items=items_out)


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    """Return a single outfit owned by the authenticated user, or 404."""
    outfit = (
        db.query(Outfit)
        .options(selectinload(Outfit.outfit_items).selectinload(OutfitItem.item))
        .filter(Outfit.id == outfit_id, Outfit.user_id == user.id)
        .first()
    )
    if outfit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    return _serialize_outfit(outfit)


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete an outfit owned by the authenticated user; its items remain."""
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id, Outfit.user_id == user.id).first()
    if outfit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    db.delete(outfit)
    db.commit()
