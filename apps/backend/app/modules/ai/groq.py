"""Backward-compatible alias — use AIService for new code."""
from app.modules.ai.service import AIService as GroqService

__all__ = ["GroqService"]
