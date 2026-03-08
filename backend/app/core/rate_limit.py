from fastapi import HTTPException
import time

REQUEST_LOG = {}

LIMIT = 30
WINDOW = 60


def rate_limit(user_id: int):

    now = time.time()

    if user_id not in REQUEST_LOG:
        REQUEST_LOG[user_id] = []

    REQUEST_LOG[user_id] = [
        t for t in REQUEST_LOG[user_id] if now - t < WINDOW
    ]

    if len(REQUEST_LOG[user_id]) >= LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

    REQUEST_LOG[user_id].append(now)