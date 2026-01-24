from datetime import datetime, timedelta
from typing import Dict, List, Any
from app.db.client import get_db
from app.core.constants import CONVERSATION_STATUS_ACTIVE, MESSAGE_ROLE_USER

class DashboardService:
    @staticmethod
    async def get_stats(user_email: str) -> Dict[str, Any]:
        """Get dashboard statistics for a specific user."""
        db = await get_db()
        
        # Total assigned conversations (active or closed)
        total_assigned = await db.conversation.count(
            where={
                "assignedTo": user_email
            }
        )
        
        # Active assigned conversations
        active_assigned = await db.conversation.count(
            where={
                "assignedTo": user_email,
                "status": CONVERSATION_STATUS_ACTIVE
            }
        )
        
        # Completed (assuming "closed" or similar status, checking schema)
        # Schema has `closedAt` which suggests a closed state, or status != 'active'
        completed_count = await db.conversation.count(
            where={
                "assignedTo": user_email,
                "status": {"not": CONVERSATION_STATUS_ACTIVE}
            }
        )
        
        # Recent activity (e.g. messages in last 24h in assigned conversations)
        # This is a bit complex to efficiently query with just Prisma wrapper, skipping deep count for now
        # Simpler: Count of leads with status update in last 24h
        yesterday = datetime.now() - timedelta(days=1)
        recent_updates = await db.conversation.count(
            where={
                "assignedTo": user_email,
                "updatedAt": {"gte": yesterday}
            }
        )
        
        return {
            "total_items": total_assigned,
            "active_items": active_assigned,
            "completed_items": completed_count,
            "recent_activity_count": recent_updates
        }

    @staticmethod
    async def get_activity(user_email: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activity for user's assigned leads."""
        db = await get_db()
        
        # Get conversations updated recently
        conversations = await db.conversation.find_many(
            where={
                "assignedTo": user_email
            },
            order={"updatedAt": "desc"},
            take=limit,
            include={
                "customer": True,
                "messages": {
                    "take": 1,
                    "order_by": {"timestamp": "desc"}
                }
            }
        )
        
        activity_feed = []
        for conv in conversations:
            last_msg = conv.messages[0] if conv.messages else None
            
            activity_feed.append({
                "id": conv.id,
                "type": "conversation_update",
                "customer_name": conv.customer.name or conv.customer.phone,
                "lead_status": conv.leadStatus,
                "last_message": last_msg.message if last_msg else None,
                "timestamp": conv.updatedAt.isoformat(),
                "status": conv.status
            })
            
        return activity_feed

    @staticmethod
    def get_summary(user_name: str) -> Dict[str, str]:
        """Get personalized summary/greeting."""
        hour = datetime.now().hour
        if 5 <= hour < 12:
            greeting = "Good morning"
        elif 12 <= hour < 18:
            greeting = "Good afternoon"
        else:
            greeting = "Good evening"
            
        return {
            "greeting": f"{greeting}, {user_name}",
            "message": "Here's what's happening with your leads today."
        }
