"""Gmail IMAP fetcher using stdlib imaplib."""
import imaplib
import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple

from app.modules.email.parser import ParsedEmail, parse_email_bytes

logger = logging.getLogger(__name__)

IMAP_TIMEOUT_SECONDS = 30
MAX_UNSEEN_PER_POLL = 15


@dataclass
class EmailAccountConfig:
    id: str
    name: str
    email: str
    app_password: str
    imap_host: str = "imap.gmail.com"
    imap_port: int = 993
    active: bool = True


@dataclass
class FetchedEmail:
    uid: str
    parsed: ParsedEmail
    raw: bytes


def _connect(account: EmailAccountConfig) -> imaplib.IMAP4_SSL:
    client = imaplib.IMAP4_SSL(account.imap_host, account.imap_port)
    if client.sock:
        client.sock.settimeout(IMAP_TIMEOUT_SECONDS)
    client.login(account.email, account.app_password)
    return client


def test_imap_connection(account: EmailAccountConfig) -> Tuple[bool, str]:
    """Test IMAP login. Returns (success, message)."""
    client = None
    try:
        client = _connect(account)
        client.select("INBOX")
        return True, f"Connected to {account.email} via IMAP"
    except imaplib.IMAP4.error as exc:
        return False, f"IMAP authentication failed: {exc}"
    except Exception as exc:
        return False, f"IMAP connection failed: {exc}"
    finally:
        if client:
            try:
                client.logout()
            except Exception:
                pass


def fetch_unseen_emails(account: EmailAccountConfig) -> List[FetchedEmail]:
    """Fetch all UNSEEN messages from INBOX."""
    results: List[FetchedEmail] = []
    client = None
    try:
        client = _connect(account)
        status, _ = client.select("INBOX")
        if status != "OK":
            logger.error("Failed to select INBOX for %s", account.email)
            return results

        status, data = client.search(None, "UNSEEN")
        if status != "OK" or not data or not data[0]:
            return results

        uids = data[0].split()
        if len(uids) > MAX_UNSEEN_PER_POLL:
            logger.info(
                "Capping IMAP fetch to %s of %s unseen messages for %s",
                MAX_UNSEEN_PER_POLL,
                len(uids),
                account.email,
            )
            uids = uids[:MAX_UNSEEN_PER_POLL]
        for uid in uids:
            uid_str = uid.decode() if isinstance(uid, bytes) else str(uid)
            # BODY.PEEK[] fetches without setting the IMAP \Seen flag in Gmail.
            status, msg_data = client.fetch(uid, "(BODY.PEEK[])")
            if status != "OK" or not msg_data or not msg_data[0]:
                continue
            raw = msg_data[0][1]
            if not isinstance(raw, bytes):
                continue
            parsed = parse_email_bytes(raw)
            if not parsed:
                continue
            results.append(FetchedEmail(uid=uid_str, parsed=parsed, raw=raw))

        return results
    except imaplib.IMAP4.error as exc:
        logger.warning("IMAP authentication failed for %s: %s", account.email, exc)
        return results
    except Exception as exc:
        logger.error("IMAP fetch failed for %s: %s", account.email, exc)
        return results
    finally:
        if client:
            try:
                client.logout()
            except Exception:
                pass


def _message_id_search_variants(message_id: str) -> List[str]:
    """Return Message-ID forms to try in IMAP HEADER search."""
    mid = message_id.strip()
    if not mid:
        return []
    variants = [mid]
    if mid.startswith("<") and mid.endswith(">"):
        variants.append(mid[1:-1])
    elif not mid.startswith("<"):
        variants.append(f"<{mid}>")
    return list(dict.fromkeys(variants))


def _find_uid_by_message_id(client: imaplib.IMAP4_SSL, message_id: str) -> Optional[bytes]:
    for mid in _message_id_search_variants(message_id):
        status, data = client.search(None, "HEADER", "Message-ID", mid)
        if status == "OK" and data and data[0]:
            uids = data[0].split()
            if uids:
                return uids[-1]
    return None


def mark_email_seen_by_message_id(account: EmailAccountConfig, message_id: str) -> bool:
    """Find a message in INBOX by RFC Message-ID and mark it \\Seen in Gmail."""
    client = None
    try:
        client = _connect(account)
        client.select("INBOX")
        uid = _find_uid_by_message_id(client, message_id)
        if not uid:
            return False
        status, _ = client.store(uid, "+FLAGS", "\\Seen")
        client.logout()
        return status == "OK"
    except Exception as exc:
        logger.error("Failed to mark email %s as read: %s", message_id, exc)
        if client:
            try:
                client.logout()
            except Exception:
                pass
        return False
