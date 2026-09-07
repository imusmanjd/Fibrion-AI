"""
backend/services/auth_service.py

The two genuinely dangerous parts of auth - hashing passwords and
signing/verifying tokens - delegated entirely to passlib and
python-jose. Nothing here reimplements cryptography; it just wires
those libraries to this app's settings.
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return _pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str) -> str:
    """
    Builds a signed JWT whose only claim is which user it belongs to
    and when it expires. Nothing sensitive goes in the payload - a
    JWT's contents are base64-encoded, not encrypted, so anyone who
    intercepts it can read them (they just can't forge a new one
    without the secret key).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Returns the user_id encoded in the token, or None if it's missing, expired, or forged."""
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except JWTError:
        return None