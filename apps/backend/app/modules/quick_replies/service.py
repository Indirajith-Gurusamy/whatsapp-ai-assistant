"""Canned quick replies for agents."""
from typing import List, Optional
from app.db.client import get_db


class QuickReplyService:
    @staticmethod
    def _serialize(row) -> dict:
        return {
            "uuid": row.uuid,
            "title": row.title,
            "body": row.body,
            "category": row.category,
            "sort_order": row.sortOrder,
            "is_active": row.isActive,
        }

    @staticmethod
    async def list_active() -> List[dict]:
        db = await get_db()
        rows = await db.quickreply.find_many(
            where={"isActive": True},
            order={"sortOrder": "asc"},
        )
        return [QuickReplyService._serialize(r) for r in rows]

    @staticmethod
    async def list_all() -> List[dict]:
        db = await get_db()
        rows = await db.quickreply.find_many(order={"sortOrder": "asc"})
        return [QuickReplyService._serialize(r) for r in rows]

    @staticmethod
    async def create(data: dict) -> dict:
        db = await get_db()
        row = await db.quickreply.create(
            data={
                "title": data["title"],
                "body": data["body"],
                "category": data.get("category"),
                "sortOrder": data.get("sort_order", 0),
                "isActive": data.get("is_active", True),
            }
        )
        return QuickReplyService._serialize(row)

    @staticmethod
    async def update(uuid: str, data: dict) -> Optional[dict]:
        db = await get_db()
        existing = await db.quickreply.find_unique(where={"uuid": uuid})
        if not existing:
            return None
        payload = {}
        if "title" in data and data["title"] is not None:
            payload["title"] = data["title"]
        if "body" in data and data["body"] is not None:
            payload["body"] = data["body"]
        if "category" in data:
            payload["category"] = data["category"]
        if data.get("sort_order") is not None:
            payload["sortOrder"] = data["sort_order"]
        if data.get("is_active") is not None:
            payload["isActive"] = data["is_active"]
        row = await db.quickreply.update(where={"uuid": uuid}, data=payload)
        return QuickReplyService._serialize(row)

    @staticmethod
    async def delete(uuid: str) -> bool:
        db = await get_db()
        existing = await db.quickreply.find_unique(where={"uuid": uuid})
        if not existing:
            return False
        await db.quickreply.delete(where={"uuid": uuid})
        return True
