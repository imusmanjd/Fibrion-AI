"""
backend/api/deps.py

Shared FastAPI dependencies. get_current_user is what any future
route uses to require a logged-in user - e.g.
`user: User = Depends(get_current_user)` on the upload/runs routes,
once runs are scoped to accounts.
"""

import uuid

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.models import User
from services.auth_service import decode_access_token

COOKIE_NAME = "fibrion_session"


def get_current_user(
    fibrion_session: str | None = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
    )

    if not fibrion_session:
        raise unauthorized

    user_id = decode_access_token(fibrion_session)
    if not user_id:
        raise unauthorized

    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise unauthorized

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user or not user.is_active:
        raise unauthorized

    return user