"""ORM models for the wardrobe manager.

``OutfitItem`` is the association model linking an ``Outfit`` to its
``ClothingItem`` members (many-to-many). Every row that belongs to a user
carries a ``user_id`` foreign key with ``ondelete="CASCADE"``, so deleting a
user removes all of their wardrobe and outfit data; deleting an outfit or a
clothing item removes the corresponding ``OutfitItem`` links the same way.
"""

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    clothing_items = relationship(
        "ClothingItem", back_populates="owner", cascade="all, delete-orphan"
    )
    outfits = relationship("Outfit", back_populates="owner", cascade="all, delete-orphan")


class ClothingItem(Base):
    __tablename__ = "clothing_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    image_url = Column(String, nullable=False)

    owner = relationship("User", back_populates="clothing_items")
    outfit_items = relationship("OutfitItem", back_populates="item", cascade="all, delete-orphan")


class Outfit(Base):
    __tablename__ = "outfits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)

    owner = relationship("User", back_populates="outfits")
    outfit_items = relationship("OutfitItem", back_populates="outfit", cascade="all, delete-orphan")


class OutfitItem(Base):
    __tablename__ = "outfit_items"

    id = Column(Integer, primary_key=True, index=True)
    outfit_id = Column(
        Integer, ForeignKey("outfits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item_id = Column(
        Integer,
        ForeignKey("clothing_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    outfit = relationship("Outfit", back_populates="outfit_items")
    item = relationship("ClothingItem", back_populates="outfit_items")
