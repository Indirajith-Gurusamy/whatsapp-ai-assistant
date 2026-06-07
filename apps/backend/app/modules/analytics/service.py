"""Analytics service."""
from datetime import datetime, timezone
from app.modules.conversations.service import ConversationService
from app.modules.analytics.pipeline import compute_pipeline_analytics
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics data."""

    @staticmethod
    async def get_analytics():
        """Get analytics data including real response times and pipeline metrics."""
        try:
            messages = await ConversationService.get_messages(1000)
            responses = await ConversationService.get_responses(1000)

            total_messages = len(messages)
            total_responses = len([r for r in responses if r.get("status") == "sent"])

            raw_rate = (total_responses / total_messages * 100) if total_messages > 0 else 0

            pipeline = await compute_pipeline_analytics()
            rt = pipeline.get("response_time", {})

            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            messages_today = len(
                [
                    m
                    for m in messages
                    if str(m.get("timestamp", "")).startswith(today)
                ]
            )

            analytics = {
                "total_messages": total_messages,
                "total_responses": total_responses,
                "success_rate": round(min(raw_rate, 100), 2),
                "average_response_time": rt.get("median_display") or "—",
                "average_response_seconds": rt.get("median_seconds", 0),
                "unique_users": len(set(m["phone"] for m in messages)),
                "messages_today": messages_today,
                "pipeline": pipeline,
            }
            return analytics
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            raise
