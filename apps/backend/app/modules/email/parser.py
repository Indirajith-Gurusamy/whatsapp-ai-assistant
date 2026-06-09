"""Parse raw email MIME into structured fields."""

import logging

from dataclasses import dataclass

from datetime import datetime, timezone

from email import message_from_bytes

from email.header import decode_header

from email.utils import parseaddr, parsedate_to_datetime

from typing import Any, List, Optional, Tuple



import html2text



from app.core.datetime_utils import utc_now
from app.modules.email.sanitize import sanitize_email_html



logger = logging.getLogger(__name__)



_html_converter = html2text.HTML2Text()

_html_converter.ignore_links = False

_html_converter.ignore_images = False

_html_converter.body_width = 0





@dataclass

class ParsedEmail:

    message_id: str

    sender_email: str

    sender_name: str

    subject: str

    date: datetime

    plain_body: str

    html_body: Optional[str] = None





def _decode_header(value: Optional[str]) -> str:

    if not value:

        return ""

    parts = decode_header(value)

    decoded = []

    for part, charset in parts:

        if isinstance(part, bytes):

            decoded.append(part.decode(charset or "utf-8", errors="replace"))

        else:

            decoded.append(part)

    return "".join(decoded).strip()





def _decode_part_text(payload: bytes, charset: Optional[str]) -> str:

    enc = charset or "utf-8"

    try:

        return payload.decode(enc, errors="replace")

    except LookupError:

        return payload.decode("utf-8", errors="replace")





def _collect_body_parts(msg: Any) -> Tuple[List[str], List[str]]:

    plain_parts: List[str] = []

    html_parts: List[str] = []



    if msg.is_multipart():

        for part in msg.walk():

            content_type = part.get_content_type()

            disposition = str(part.get("Content-Disposition", ""))

            if "attachment" in disposition:

                continue

            payload = part.get_payload(decode=True)

            if payload is None:

                continue

            text = _decode_part_text(payload, part.get_content_charset())

            if content_type == "text/plain":

                plain_parts.append(text.strip())

            elif content_type == "text/html":

                html_parts.append(text)

    else:

        payload = msg.get_payload(decode=True)

        if payload is not None:

            text = _decode_part_text(payload, msg.get_content_charset())

            if msg.get_content_type() == "text/html":

                html_parts.append(text)

            else:

                plain_parts.append(text.strip())



    return plain_parts, html_parts





def _extract_plain_body(plain_parts: List[str], html_parts: List[str]) -> str:

    if plain_parts:

        return "\n\n".join(p for p in plain_parts if p)



    if html_parts:

        return "\n\n".join(

            _html_converter.handle(html).strip() for html in html_parts if html

        )



    return ""





def _extract_html_body(html_parts: List[str]) -> Optional[str]:

    if not html_parts:

        return None

    # Prefer the richest HTML part (marketing/security emails often have multiple)

    raw = max(html_parts, key=len)

    return sanitize_email_html(raw)





def parse_email_bytes(raw: bytes) -> Optional[ParsedEmail]:

    """Parse raw RFC822 bytes into a ParsedEmail."""

    try:

        msg = message_from_bytes(raw)

    except Exception as exc:

        logger.warning("Failed to parse email bytes: %s", exc)

        return None



    message_id = _decode_header(msg.get("Message-ID")) or ""

    if not message_id:

        logger.warning("Email missing Message-ID — skipping")

        return None



    from_header = _decode_header(msg.get("From"))

    sender_name, sender_email = parseaddr(from_header)

    sender_email = (sender_email or "").strip().lower()

    if not sender_email:

        logger.warning("Email missing sender address — skipping")

        return None



    if not sender_name:

        sender_name = sender_email.split("@")[0]



    subject = _decode_header(msg.get("Subject")) or "(No subject)"

    date_header = msg.get("Date")

    try:

        if date_header:

            date = parsedate_to_datetime(date_header)

            if date.tzinfo is not None:

                date = date.astimezone(timezone.utc).replace(tzinfo=None)

        else:

            date = utc_now()

    except Exception:

        date = utc_now()



    plain_parts, html_parts = _collect_body_parts(msg)

    plain_body = _extract_plain_body(plain_parts, html_parts).strip()

    html_body = _extract_html_body(html_parts)



    if not plain_body:

        plain_body = "(No message body)"



    return ParsedEmail(

        message_id=message_id,

        sender_email=sender_email,

        sender_name=sender_name,

        subject=subject,

        date=date,

        plain_body=plain_body,

        html_body=html_body,

    )





def format_crm_message(parsed: ParsedEmail) -> str:

    """Format email plain-text content for storage in the CRM message field."""

    return f"Subject: {parsed.subject}\n\n{parsed.plain_body}"


