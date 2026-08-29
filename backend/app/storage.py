"""Local filesystem storage for uploaded clothing images.

Images live under ``<UPLOAD_DIR>/<user_id>/<item_id>.<ext>`` so a file can be
reconstructed from its item id alone, survives a backend restart (AC-02) and can
be cleaned up per user (AC-14) or per item (AC-06).

``save_image`` rejects any content type other than jpeg/png/webp and any body
over ``MAX_UPLOAD_BYTES``. The size limit is enforced in two layers: the router
checks the ``Content-Length`` header up front (AC-07) so an oversized upload is
refused before the request body is buffered, and ``save_image`` re-checks the
bytes it actually reads as a defence in depth.
"""

import shutil
from pathlib import Path

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import get_settings

# Content type -> file extension. The value doubles as the on-disk suffix and the
# media type used when the image is served back.
_ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

_MEDIA_TYPE_BY_SUFFIX: dict[str, str] = {
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def get_upload_dir() -> Path:
    """Return the configured upload directory as a ``Path``."""
    return Path(get_settings().upload_dir)


def ensure_upload_dir() -> Path:
    """Create the upload directory if it does not exist and return it."""
    directory = get_upload_dir()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def user_dir(user_id: int) -> Path:
    """Return the per-user subdirectory for ``user_id``."""
    return get_upload_dir() / str(user_id)


def check_content_length(content_length: str | None) -> None:
    """Reject a request whose ``Content-Length`` exceeds ``MAX_UPLOAD_BYTES``.

    Answers 413 *before* the body is buffered (AC-07). A missing header (e.g.
    chunked transfer) is allowed through here; ``save_image`` enforces the actual
    byte count later.
    """
    if content_length is None:
        return
    try:
        length = int(content_length)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Content-Length") from None
    if length > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Upload exceeds the maximum allowed size")


def save_image(user_id: int, file: UploadFile, item_id: int) -> Path:
    """Validate ``file`` and write it to ``<user_id>/<item_id>.<ext>``.

    Raises 422 for an unsupported content type, 413 when the body exceeds
    ``MAX_UPLOAD_BYTES`` and 422 for an empty upload. Any previous image for the
    same item is replaced.
    """
    extension = _ALLOWED_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported image type; expected jpeg, png or webp",
        )

    data = file.file.read()
    if len(data) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=413, detail="Upload exceeds the maximum allowed size")
    if not data:
        raise HTTPException(status_code=422, detail="Empty image")

    directory = user_dir(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    for existing in directory.glob(f"{item_id}.*"):
        existing.unlink(missing_ok=True)

    path = directory / f"{item_id}{extension}"
    path.write_bytes(data)
    return path


def get_image_path(user_id: int, item_id: int) -> Path | None:
    """Return the stored image path for an item, or ``None`` when absent."""
    matches = list(user_dir(user_id).glob(f"{item_id}.*"))
    return matches[0] if matches else None


def media_type_for(path: Path) -> str:
    """Return the media type for a stored image path."""
    return _MEDIA_TYPE_BY_SUFFIX.get(path.suffix, "application/octet-stream")


def serve_image(user_id: int, item_id: int) -> FileResponse:
    """Return a ``FileResponse`` for an item's stored image, or 404."""
    path = get_image_path(user_id, item_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path, media_type=media_type_for(path))


def delete_image(user_id: int, item_id: int) -> None:
    """Delete every stored image file belonging to an item."""
    for path in user_dir(user_id).glob(f"{item_id}.*"):
        path.unlink(missing_ok=True)


def delete_all_images_for_user(user_id: int) -> None:
    """Delete the entire upload subdirectory of a user (AC-14)."""
    shutil.rmtree(user_dir(user_id), ignore_errors=True)
