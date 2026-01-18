"""Analytics service."""
from datetime import datetime
from app.modules.conversations.service import ConversationService
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for analytics data."""
    
    @staticmethod
    async def get_analytics():
        """Get analytics data."""
        try:
            messages = await ConversationService.get_messages(1000)
            responses = await ConversationService.get_responses(1000)
            
            total_messages = len(messages)
            total_responses = len([r for r in responses if r.get('status') == 'sent'])
            
            analytics = {
                "total_messages": total_messages,
                "total_responses": total_responses,
                "success_rate": round((total_responses / total_messages * 100) if total_messages > 0 else 0, 2),
                "average_response_time": "~2 seconds",
                "unique_users": len(set(m['phone'] for m in messages)),
                "messages_today": len([m for m in messages if m['timestamp'].startswith(datetime.now().strftime("%Y-%m-%d"))]),
            }
            return analytics
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            raise
