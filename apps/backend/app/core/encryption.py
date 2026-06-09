"""Fernet encryption utility for sensitive settings values."""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

MASKED_SECRET_PLACEHOLDER = "••••••••"

_fernet_instance = None


def _get_fernet() -> Fernet:
    """Get or create a Fernet instance using the ENCRYPTION_KEY env var."""
    global _fernet_instance
    if _fernet_instance is None:
        key = os.environ.get("ENCRYPTION_KEY")
        if not key:
            logger.warning(
                "ENCRYPTION_KEY not set – generating a temporary key. "
                "Set ENCRYPTION_KEY in .env for production!"
            )
            key = Fernet.generate_key().decode()
        _fernet_instance = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet_instance


def encrypt_value(plain_text: str) -> str:
    """Encrypt a plaintext string and return the ciphertext as a UTF-8 string."""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_value(cipher_text: str) -> str:
    """Decrypt a ciphertext string and return the original plaintext."""
    try:
        f = _get_fernet()
        return f.decrypt(cipher_text.encode()).decode()
    except InvalidToken as e:
        logger.error("Decryption failed — wrong ENCRYPTION_KEY or corrupt ciphertext: %s", e)
        raise ValueError("Failed to decrypt setting") from e
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Failed to decrypt setting") from e


def decrypt_setting_value(cipher_text: str) -> str:
    """Decrypt a stored setting for reads; mask on failure so settings loading survives."""
    try:
        return decrypt_value(cipher_text)
    except ValueError:
        return MASKED_SECRET_PLACEHOLDER


def require_stable_encryption_key() -> None:
    """Fail fast in production when ENCRYPTION_KEY is missing."""
    if os.getenv("APP_ENV", "local") != "production":
        return
    if not os.environ.get("ENCRYPTION_KEY"):
        raise RuntimeError(
            "ENCRYPTION_KEY must be set in production — ephemeral keys break stored secrets after restart"
        )


# Sensitive keys that must always be encrypted in the database
SENSITIVE_KEYS = frozenset({
    "twilio_auth_token",
    "groq_api_key",
    "app_secret",
    "access_token",
    "webhook_verify_token",
    "whatsapp_accounts",
    "ai_providers",
    "email_accounts",
    "app_password",
})
