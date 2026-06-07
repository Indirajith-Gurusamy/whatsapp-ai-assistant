"""Meta WhatsApp Cloud API helpers — resolve Phone Number ID and validate credentials."""
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

DEFAULT_META_API_VERSION = "v23.0"

# Graph error when a Phone Number ID is used where a WABA ID is expected.
_WRONG_NODE_FIELD_MARKERS = ("phone_numbers", "message_templates")


def _is_wrong_node_type_error(data: Dict[str, Any]) -> bool:
    err = data.get("error") if isinstance(data, dict) else None
    if not isinstance(err, dict) or err.get("code") != 100:
        return False
    msg = str(err.get("message", "")).lower()
    return "nonexisting field" in msg and any(m in msg for m in _WRONG_NODE_FIELD_MARKERS)


async def _graph_get(
    path: str, token: str, api_version: str
) -> Tuple[int, Dict[str, Any]]:
    url = f"https://graph.facebook.com/{api_version}/{path.lstrip('/')}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
        )
    try:
        body = response.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return response.status_code, body


async def list_waba_phone_numbers(
    waba_id: str, token: str, api_version: str
) -> List[Dict[str, Any]]:
    """List phone numbers registered under a WhatsApp Business Account."""
    status, data = await _graph_get(
        f"{waba_id}/phone_numbers?fields=id,display_phone_number,verified_name",
        token,
        api_version,
    )
    if status != 200:
        if _is_wrong_node_type_error(data):
            logger.debug(
                "ID %s is not a WABA (phone_numbers edge unavailable): %s",
                waba_id,
                (data.get("error") or {}).get("message", status),
            )
        else:
            logger.warning(
                "Could not list phone numbers for WABA %s: %s %s",
                waba_id,
                status,
                data,
            )
        return []
    return data.get("data") or []


def _parse_waba_ref(value: Any) -> Optional[str]:
    if isinstance(value, dict) and value.get("id"):
        return str(value["id"])
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


async def verify_phone_number_id(
    phone_id: str, token: str, api_version: str
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Return True if this ID is a valid WhatsApp Business phone number object."""
    status, data = await _graph_get(
        f"{phone_id}?fields=id,display_phone_number,verified_name,whatsapp_business_account",
        token,
        api_version,
    )
    if status != 200:
        return False, data
    if data.get("id") or data.get("display_phone_number"):
        return True, data
    return False, data


async def _waba_from_phone_node(
    phone_id: str, token: str, api_version: str
) -> Optional[str]:
    """Read parent WABA id from a valid WhatsApp Business phone number node."""
    status, data = await _graph_get(
        f"{phone_id}?fields=whatsapp_business_account{{id}}",
        token,
        api_version,
    )
    if status == 200:
        waba = _parse_waba_ref(data.get("whatsapp_business_account"))
        if waba:
            return waba

    # Reuse details from verify if already fetched
    ok, details = await verify_phone_number_id(phone_id, token, api_version)
    if ok and details:
        waba = _parse_waba_ref(details.get("whatsapp_business_account"))
        if waba:
            return waba

    if ok:
        logger.debug(
            "Phone %s is valid but whatsapp_business_account missing — "
            "token may need whatsapp_business_management scope",
            phone_id,
        )
    return None


async def verify_waba_owns_phone(
    waba_id: str, phone_id: str, token: str, api_version: str
) -> bool:
    """True if phone_number_id is registered under this WABA."""
    if not waba_id or not phone_id:
        return False
    numbers = await list_waba_phone_numbers(waba_id, token, api_version)
    return any(str(n.get("id", "")) == phone_id for n in numbers)


async def resolve_waba_id(
    config: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Resolve WhatsApp Business Account ID for Meta API calls.

    Uses stored waba_id, treats phone_number_id as a WABA candidate when users
    paste the wrong ID, or reads whatsapp_business_account from the phone node.
    """
    token = (config.get("access_token") or "").strip()
    phone_id = (config.get("phone_number_id") or "").strip()
    waba_id = (config.get("waba_id") or "").strip()
    api_version = (config.get("api_version") or DEFAULT_META_API_VERSION).strip()

    if not token:
        return None, "Meta access token is missing", None

    # Prefer resolving from Phone Number ID (Meta API Setup) — not the same as WABA ID.
    if phone_id:
        ok, details = await verify_phone_number_id(phone_id, token, api_version)
        if ok:
            parent = _parse_waba_ref((details or {}).get("whatsapp_business_account"))
            if not parent:
                parent = await _waba_from_phone_node(phone_id, token, api_version)
            if parent:
                info: Dict[str, Any] = {
                    "source": "phone_whatsapp_business_account",
                    "waba_id": parent,
                    "phone_number_id": phone_id,
                }
                if waba_id and waba_id != parent:
                    info["corrected_from"] = waba_id
                return parent, None, info

    # Only call /phone_numbers on a distinct WABA ID (not the phone number ID).
    if waba_id and waba_id != phone_id:
        numbers = await list_waba_phone_numbers(waba_id, token, api_version)
        if numbers:
            return waba_id, None, {"source": "waba_id", "phone_count": len(numbers)}

    hint = ""
    if waba_id and waba_id == phone_id:
        hint = (
            " Your WABA field matches Phone Number ID — use the separate "
            "WhatsApp Business Account ID from Business Manager, or leave WABA empty."
        )

    return (
        None,
        "Could not resolve WhatsApp Business Account ID. In Settings → WhatsApp, set "
        "Phone Number ID from API Setup, use a token with whatsapp_business_management, "
        "and add WABA ID from Business Manager → WhatsApp accounts if auto-detect fails."
        + hint,
        None,
    )


async def resolve_meta_config(
    config: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Resolve the correct Meta Phone Number ID for sending messages.

    Users often paste the WABA ID into the Phone Number ID field — this looks up
    the real phone number ID via the Graph API.

    Returns:
        (phone_number_id, error_message, debug_info)
    """
    token = (config.get("access_token") or "").strip()
    phone_id = (config.get("phone_number_id") or "").strip()
    waba_id = (config.get("waba_id") or "").strip()
    api_version = (config.get("api_version") or DEFAULT_META_API_VERSION).strip()

    if not token:
        return None, "Meta access token is required", None

    phone_ok = False
    phone_details: Optional[Dict[str, Any]] = None
    if phone_id:
        phone_ok, phone_details = await verify_phone_number_id(
            phone_id, token, api_version
        )
        if phone_ok:
            return phone_id, None, {
                "source": "phone_number_id",
                "display_phone_number": (phone_details or {}).get(
                    "display_phone_number"
                ),
                "verified_name": (phone_details or {}).get("verified_name"),
            }

    waba_candidates: List[str] = []
    if waba_id and waba_id != phone_id:
        waba_candidates.append(waba_id)
    # User may have pasted WABA ID into the Phone Number ID field.
    if phone_id and not phone_ok and phone_id not in waba_candidates:
        waba_candidates.append(phone_id)

    for waba in waba_candidates:
        numbers = await list_waba_phone_numbers(waba, token, api_version)
        if not numbers:
            continue

        chosen = numbers[0]
        resolved_id = str(chosen.get("id", ""))
        if not resolved_id:
            continue

        info: Dict[str, Any] = {
            "source": "waba_phone_numbers",
            "waba_id": waba,
            "resolved_phone_number_id": resolved_id,
            "display_phone_number": chosen.get("display_phone_number"),
            "verified_name": chosen.get("verified_name"),
            "available_phone_numbers": numbers,
        }
        if phone_id and phone_id != resolved_id:
            info["corrected_from"] = phone_id
            logger.warning(
                f"[META] phone_number_id '{phone_id}' invalid; using '{resolved_id}' from WABA {waba}"
            )
        return resolved_id, None, info

    if phone_id:
        _, err_body = await verify_phone_number_id(phone_id, token, api_version)
        err_msg = (err_body or {}).get("error", {}).get("message", "")
        return None, (
            "Invalid Phone Number ID. In Meta Developer → WhatsApp → API Setup, "
            "copy **Phone number ID** (not WhatsApp Business Account ID). "
            f"Graph API: {err_msg or 'object not found or token lacks permission'}"
        ), None

    return (
        None,
        "Add Phone number ID from Meta API Setup, or WABA ID so we can resolve it automatically.",
        None,
    )
