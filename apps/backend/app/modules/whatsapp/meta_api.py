"""Meta WhatsApp Cloud API helpers — resolve Phone Number ID and validate credentials."""
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

DEFAULT_META_API_VERSION = "v21.0"


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
        logger.warning(
            f"Could not list phone numbers for WABA {waba_id}: {status} {data}"
        )
        return []
    return data.get("data") or []


async def verify_phone_number_id(
    phone_id: str, token: str, api_version: str
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """Return True if this ID is a valid WhatsApp Business phone number object."""
    status, data = await _graph_get(phone_id, token, api_version)
    if status != 200:
        return False, data
    if data.get("id") or data.get("display_phone_number"):
        return True, data
    return False, data


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

    if phone_id:
        ok, details = await verify_phone_number_id(phone_id, token, api_version)
        if ok:
            return phone_id, None, {
                "source": "phone_number_id",
                "display_phone_number": details.get("display_phone_number"),
                "verified_name": details.get("verified_name"),
            }

    waba_candidates: List[str] = []
    for candidate in (waba_id, phone_id):
        if candidate and candidate not in waba_candidates:
            waba_candidates.append(candidate)

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
