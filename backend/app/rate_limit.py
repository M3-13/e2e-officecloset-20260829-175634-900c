"""In-memory rate limiting for the auth endpoints.

A fixed-limit sliding window per client, as required by AC-08: after
``MAX_ATTEMPTS`` attempts within ``WINDOW_SECONDS`` the client is blocked and the
caller answers 429.

State lives in a module-level ``RateLimiter`` keyed by ``(client, scope)``. The
scope separates register from login so each gets its own budget, while the client
address keeps the limit "per client" as the spec words it. Storage is a
``defaultdict`` of deques of ``time.monotonic`` timestamps: entries older than the
window are dropped lazily on the next check, so a blocked client is unblocked
automatically once its oldest attempts age out.

This is process-local on purpose: with multiple uvicorn workers each process
would keep its own counters, which is fine for the single-process dev/CI
deployment and matches the "in-memory" requirement literally.
"""

import time
from collections import defaultdict, deque

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60


class RateLimiter:
    """Track attempts per (client, scope) and deny when the budget is spent."""

    def __init__(
        self, max_attempts: int = MAX_ATTEMPTS, window_seconds: int = WINDOW_SECONDS
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def is_allowed(self, client: str, scope: str) -> bool:
        """Record an attempt for ``client``/``scope`` and report whether it's allowed.

        Returns ``False`` (and does NOT record) when the client has already used
        its ``max_attempts`` within the current window; otherwise records the
        attempt and returns ``True``.
        """
        now = time.monotonic()
        bucket = self._attempts[(client, scope)]
        while bucket and now - bucket[0] >= self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.max_attempts:
            return False
        bucket.append(now)
        return True

    def reset(self, client: str | None = None, scope: str | None = None) -> None:
        """Drop recorded attempts, optionally only those for ``client``/``scope``.

        With no arguments, clears every counter (used by tests to start clean).
        """
        if client is None and scope is None:
            self._attempts.clear()
            return
        for key in list(self._attempts):
            c, s = key
            if (client is None or c == client) and (scope is None or s == scope):
                del self._attempts[key]


limiter = RateLimiter()
