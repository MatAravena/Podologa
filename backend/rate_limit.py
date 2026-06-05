"""
Lightweight in-memory rate limiter — dependency-free.

Suitable for a single-process deployment (uvicorn --workers 1). For multi-worker
or multi-server deployments, swap for a Redis-backed limiter (e.g. slowapi).

Usage:
    from rate_limit import rate_limit
    @router.post("/login", dependencies=[Depends(rate_limit("login", limit=5, window=60))])
"""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

# bucket_key -> deque[timestamps]
_buckets: dict[str, deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # Honor X-Forwarded-For when behind a trusted proxy; fall back to client host
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window: int):
    """FastAPI dependency: allow `limit` requests per `window` seconds per client IP."""

    def dependency(request: Request) -> None:
        key = f"{name}:{_client_ip(request)}"
        now = time.monotonic()
        bucket = _buckets[key]

        while bucket and bucket[0] <= now - window:
            bucket.popleft()

        if len(bucket) >= limit:
            retry_after = int(window - (now - bucket[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos. Intenta nuevamente más tarde.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)

    return dependency
