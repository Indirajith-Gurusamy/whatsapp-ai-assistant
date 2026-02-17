"""Fernet encryption utility for sensitive settings values."""
import os
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

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
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return "••••••••"


# Sensitive keys that must always be encrypted in the database
SENSITIVE_KEYS = frozenset({
    "twilio_auth_token",
    "groq_api_key",
    "app_secret",
    "access_token",
    "webhook_verify_token",
    "whatsapp_accounts",
})
