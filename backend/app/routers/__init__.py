"""Router package.

Importing this module exposes the three slice routers (auth, wardrobe, outfits)
so ``main.py`` can register them in one place.
"""

from app.routers import auth, outfits, wardrobe

__all__ = ["auth", "outfits", "wardrobe"]
