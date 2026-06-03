"""Provider-specific chat completion calls."""
import logging
import re
from typing import Dict, List, Optional, Tuple

import httpx
from groq import AsyncGroq

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def redact_secrets(text: str) -> str:
    """Remove API keys from error text before showing in the UI."""
    if not text:
        return text
    text = re.sub(r"key=[^&\s'\"\)]+", "key=***", text, flags=re.IGNORECASE)
    text = re.sub(r"AQ\.[A-Za-z0-9._-]+", "AQ.***", text)
    text = re.sub(r"sk-[A-Za-z0-9_-]+", "sk-***", text)
    return text


def _gemini_error_is_zero_quota(api_message: str, error_status: str) -> bool:
    """True when Google returns free-tier quota limit 0 (common on new/restricted accounts)."""
    msg = api_message.lower()
    if "limit: 0" in msg or "limit:0" in msg:
        return True
    if error_status == "RESOURCE_EXHAUSTED" and (
        "free_tier" in msg or "quota exceeded" in msg
    ):
        return True
    return False


def format_gemini_http_error(response: httpx.Response) -> str:
    """User-facing Gemini API error (no secrets, actionable hints)."""
    status = response.status_code
    api_message = ""
    error_status = ""
    try:
        payload = response.json()
        err = payload.get("error") or {}
        api_message = (err.get("message") or "").strip()
        error_status = (err.get("status") or "").strip()
    except Exception:
        pass

    if status == 429:
        if _gemini_error_is_zero_quota(api_message, error_status):
            return (
                "Gemini free-tier quota is 0 for this model on your Google project "
                "(Google-side limit, not a bad key). New AQ.-format keys can hit this on "
                "gemini-2.0-flash. Try gemini-2.0-flash-lite or gemini-1.5-flash, create a "
                "fresh project in Google AI Studio, enable billing if needed, and check "
                "https://ai.dev/rate-limit"
            )
        return (
            "Gemini rate limit exceeded (too many requests). "
            "Wait 1–2 minutes, avoid clicking Test repeatedly, or switch to "
            "gemini-2.0-flash-lite / gemini-1.5-flash in Settings."
        )
    if status == 403:
        hint = redact_secrets(api_message) if api_message else (
            "Check that your Gemini API key is valid and enabled in Google AI Studio."
        )
        return f"Gemini access denied: {hint}"
    if status == 404:
        return redact_secrets(api_message) or (
            "Gemini model not found. Pick another model in Settings (e.g. gemini-2.0-flash-lite)."
        )
    if api_message:
        return f"Gemini error: {redact_secrets(api_message)}"
    return f"Gemini API error (HTTP {status})."


def format_ai_error(exc: Exception) -> str:
    """Safe message for admin UI and logs shown to users."""
    if isinstance(exc, ValueError):
        return redact_secrets(str(exc))
    return redact_secrets(f"AI request failed: {exc}")


async def _groq_complete(
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    client = AsyncGroq(api_key=api_key)
    completion = await client.chat.completions.create(
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    text = completion.choices[0].message.content
    if not text or not text.strip():
        raise ValueError("Empty response from Groq")
    return text.strip()


def _messages_to_gemini(
    messages: List[Dict[str, str]],
) -> Tuple[Optional[Dict], List[Dict]]:
    system_texts: List[str] = []
    contents: List[Dict] = []

    for msg in messages:
        role = msg.get("role", "")
        text = (msg.get("content") or "").strip()
        if not text:
            continue
        if role == "system":
            system_texts.append(text)
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})

    system_instruction = None
    if system_texts:
        system_instruction = {"parts": [{"text": "\n".join(system_texts)}]}

    return system_instruction, contents


async def _gemini_complete(
    api_key: str,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    system_instruction, contents = _messages_to_gemini(messages)
    if not contents:
        raise ValueError("No messages to send to Gemini")

    body: Dict = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }
    if system_instruction:
        body["systemInstruction"] = system_instruction

    url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            json=body,
        )
        if response.status_code >= 400:
            raise ValueError(format_gemini_http_error(response))
        data = response.json()

    candidates = data.get("candidates") or []
    if not candidates:
        raise ValueError("Empty response from Gemini")

    parts = candidates[0].get("content", {}).get("parts") or []
    text_parts = [p.get("text", "") for p in parts if p.get("text")]
    text = "".join(text_parts).strip()
    if not text:
        raise ValueError("Empty response from Gemini")
    return text


async def complete_chat(
    provider_type: str,
    config: Dict[str, str],
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    api_key = (config.get("api_key") or "").strip()
    if not api_key:
        raise ValueError(f"{provider_type} API key not configured")

    # Legacy saved provider type
    if provider_type == "openai":
        provider_type = "gemini"

    model = (config.get("model") or "").strip()
    if provider_type == "groq":
        if not model:
            from app.modules.ai.providers_util import DEFAULT_GROQ_MODEL

            model = DEFAULT_GROQ_MODEL
        return await _groq_complete(api_key, model, messages, temperature, max_tokens)

    if provider_type == "gemini":
        if not model or model.startswith("gpt"):
            from app.modules.ai.providers_util import DEFAULT_GEMINI_MODEL

            model = DEFAULT_GEMINI_MODEL
        return await _gemini_complete(api_key, model, messages, temperature, max_tokens)

    raise ValueError(f"Unsupported AI provider: {provider_type}")
