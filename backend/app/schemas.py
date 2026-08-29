"""Pydantic schemas shared by every router (the sprint's data contract).

Response models carry ``from_attributes=True`` so they can be built directly
from ORM objects. Category values are restricted to the closed set the contract
defines.
"""

from pydantic import BaseModel, ConfigDict, EmailStr

CATEGORIES: tuple[str, ...] = ("oberteil", "hose", "kleid", "schuhe", "accessoire")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClothingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    image_url: str


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    items: list[ClothingItemOut]


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]
