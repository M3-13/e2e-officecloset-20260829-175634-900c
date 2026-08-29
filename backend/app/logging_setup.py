"""Logging configuration.

AC-15 (Datenschutz): no personal data may be written to server logs. This module
only sets the formatter and log level — it never receives an email address, a
JWT or an image body, and the application's own log calls follow the same rule
(see the catch-all error handler in ``main.py``, which logs method + path only).
"""

import logging


def setup_logging() -> None:
    """Configure the root logger with a fixed format and an INFO level."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
