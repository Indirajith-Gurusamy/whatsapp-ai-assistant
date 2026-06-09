"""Sanitize inbound email HTML for safe read-only display."""
import logging
import re
from typing import Optional

import bleach
from bleach.css_sanitizer import CSSSanitizer

logger = logging.getLogger(__name__)

MAX_HTML_BYTES = 512_000

_EMAIL_TAGS = frozenset(
    bleach.sanitizer.ALLOWED_TAGS
    | {
        "p",
        "div",
        "span",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "img",
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "td",
        "th",
        "center",
        "font",
        "hr",
        "style",
        "head",
        "meta",
        "link",
        "body",
        "html",
        "colgroup",
        "col",
        "caption",
        "blockquote",
        "pre",
        "sup",
        "sub",
    }
)

_EMAIL_ATTRS = {
    "*": ["class", "id", "style", "title", "role", "align", "valign", "width", "height", "bgcolor", "color"],
    "a": ["href", "name", "target", "rel"],
    "img": ["src", "alt", "width", "height"],
    "table": ["border", "cellpadding", "cellspacing", "width"],
    "td": ["colspan", "rowspan", "width", "height"],
    "th": ["colspan", "rowspan", "width", "height"],
    "col": ["span", "width"],
    "colgroup": ["span", "width"],
    "meta": ["charset", "name", "content", "http-equiv"],
    "link": ["rel", "href", "type"],
    "style": ["type"],
}

_CSS = CSSSanitizer(
    allowed_css_properties=[
        "color",
        "background",
        "background-color",
        "background-image",
        "font",
        "font-size",
        "font-family",
        "font-weight",
        "font-style",
        "text-align",
        "text-decoration",
        "text-transform",
        "line-height",
        "letter-spacing",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "border",
        "border-top",
        "border-right",
        "border-bottom",
        "border-left",
        "border-radius",
        "border-collapse",
        "width",
        "max-width",
        "min-width",
        "height",
        "max-height",
        "min-height",
        "display",
        "vertical-align",
        "white-space",
        "word-wrap",
        "overflow-wrap",
        "float",
        "clear",
    ]
)


def _truncate_utf8_bytes(text: str, max_bytes: int) -> str:
    """Truncate text so its UTF-8 encoding is at most max_bytes."""
    encoded = text.encode("utf-8", errors="ignore")
    if len(encoded) <= max_bytes:
        return text
    return encoded[:max_bytes].decode("utf-8", errors="ignore")


def _strip_dangerous_blocks(html: str) -> str:
    html = re.sub(r"(?is)<script[^>]*>.*?</script>", "", html)
    html = re.sub(r"(?is)<iframe[^>]*>.*?</iframe>", "", html)
    html = re.sub(r"(?is)<object[^>]*>.*?</object>", "", html)
    html = re.sub(r"(?is)<embed[^>]*/?>", "", html)
    html = re.sub(r"(?is)<form[^>]*>.*?</form>", "", html)
    return html


def sanitize_email_html(raw: Optional[str]) -> Optional[str]:
    """Return sanitized HTML suitable for sandboxed iframe display."""
    if not raw or not raw.strip():
        return None

    raw_bytes = len(raw.encode("utf-8", errors="ignore"))
    if raw_bytes > MAX_HTML_BYTES:
        logger.info(
            "Email HTML truncated before sanitize (%s bytes > %s)",
            raw_bytes,
            MAX_HTML_BYTES,
        )
        raw = _truncate_utf8_bytes(raw, MAX_HTML_BYTES)

    cleaned = bleach.clean(
        _strip_dangerous_blocks(raw),
        tags=_EMAIL_TAGS,
        attributes=_EMAIL_ATTRS,
        css_sanitizer=_CSS,
        strip=False,
    )
    cleaned = cleaned.strip()
    return cleaned or None
