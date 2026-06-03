"""Parse and resolve AI provider configs from settings."""
import json
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

SUPPORTED_PROVIDERS = frozenset({"groq", "gemini"})

DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-lite"


def parse_ai_providers(raw: str) -> List[Dict[str, Any]]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, TypeError):
        logger.warning("Invalid ai_providers JSON")
        return []


def get_active_provider(providers: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not providers:
        return None
    active = next((p for p in providers if p.get("active")), None)
    return active or providers[0]


def get_provider_by_id(
    providers: List[Dict[str, Any]], provider_id: Optional[str]
) -> Optional[Dict[str, Any]]:
    if not provider_id:
        return get_active_provider(providers)
    return next((p for p in providers if p.get("id") == provider_id), None)


def _migrate_provider_list(providers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Upgrade legacy openai entries to gemini."""
    for entry in providers:
        if entry.get("provider") == "openai":
            entry["provider"] = "gemini"
            config = entry.setdefault("config", {})
            model = (config.get("model") or "").strip()
            if not model or model.startswith("gpt"):
                config["model"] = DEFAULT_GEMINI_MODEL
            name = entry.get("name") or ""
            if "OpenAI" in name:
                entry["name"] = name.replace("OpenAI", "Gemini")
    return providers


def normalize_ai_settings(data: Dict[str, str]) -> Dict[str, str]:
    """Ensure ai_providers exists; migrate legacy groq_* fields when needed."""
    providers = parse_ai_providers(data.get("ai_providers", ""))
    if providers:
        providers = _migrate_provider_list(providers)
        data["ai_providers"] = json.dumps(providers)
        return data

    api_key = (data.get("groq_api_key") or "").strip()
    model = (data.get("groq_model") or DEFAULT_GROQ_MODEL).strip()
    if not api_key:
        api_key = (app_settings.GROQ_API_KEY or "").strip()
        if api_key:
            model = (app_settings.GROQ_MODEL or DEFAULT_GROQ_MODEL).strip()

    if api_key:
        providers = [
            {
                "id": "groq-default",
                "name": "Groq",
                "provider": "groq",
                "active": True,
                "config": {"api_key": api_key, "model": model},
            }
        ]
    data["ai_providers"] = json.dumps(providers)
    return data


def build_default_ai_providers() -> str:
    if not app_settings.GROQ_API_KEY:
        return "[]"
    return json.dumps(
        [
            {
                "id": "groq-default",
                "name": "Groq",
                "provider": "groq",
                "active": True,
                "config": {
                    "api_key": app_settings.GROQ_API_KEY,
                    "model": app_settings.GROQ_MODEL or DEFAULT_GROQ_MODEL,
                },
            }
        ]
    )
