"""FastAPI application entry point (the backend skeleton).

Wires CORS for the configured frontend origin only, registers the three router
stubs, exposes ``GET /api/health`` and creates the SQLite schema on startup.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db import Base, get_engine
from app.logging_setup import setup_logging
from app.routers import auth, outfits, wardrobe

setup_logging()
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.validate()
    Base.metadata.create_all(bind=get_engine())
    yield


app = FastAPI(title="Glamouröser Kleiderschrank-Manager", lifespan=lifespan)

settings = get_settings()

# CORS is limited to the single configured frontend origin (AC-11) and carries
# credentials. No wildcard origin, no regex over localhost.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Produced INSIDE the CORS layer so a 5xx still carries its CORS headers, and
    # logs only method + path (AC-15: no email, no JWT, no body content).
    logger.exception("unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


app.include_router(auth.router)
app.include_router(wardrobe.router)
app.include_router(outfits.router)
