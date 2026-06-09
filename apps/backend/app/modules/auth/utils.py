"""Authentication utilities for password hashing and token generation."""
import secrets
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
import jwt
from app.core.config import settings
from app.core.datetime_utils import utc_now

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


_DUMMY_PASSWORD_HASH: Optional[str] = None


def _timing_safe_dummy_hash() -> str:
    """Bcrypt hash used when no user exists so login still runs verify."""
    global _DUMMY_PASSWORD_HASH
    if _DUMMY_PASSWORD_HASH is None:
        _DUMMY_PASSWORD_HASH = pwd_context.hash("timing-safe-login-placeholder")
    return _DUMMY_PASSWORD_HASH


def verify_login_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify login credentials without skipping work for unknown emails."""
    target = hashed_password if hashed_password else _timing_safe_dummy_hash()
    return pwd_context.verify(plain_password, target)


def generate_otp() -> str:
    """Generate a 6-digit OTP for email verification."""
    return str(secrets.randbelow(900_000) + 100_000)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = utc_now() + expires_delta
    else:
        expire = utc_now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except Exception:
        return None
