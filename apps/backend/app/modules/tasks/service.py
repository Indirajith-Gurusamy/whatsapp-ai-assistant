"""Task service."""
from typing import List, Optional

from fastapi import HTTPException

from app.db.client import get_db
from app.db.prisma.enums import TaskPriority, TaskStatus


def _to_status(value: str) -> TaskStatus:
    mapping = {
        "todo": TaskStatus.todo,
        "in_progress": TaskStatus.in_progress,
        "review": TaskStatus.review,
        "completed": TaskStatus.completed,
        "cancelled": TaskStatus.cancelled,
    }
    key = (value or "todo").lower().replace("-", "_")
    if key not in mapping:
        raise HTTPException(status_code=400, detail=f"Invalid task status: {value}")
    return mapping[key]


def _to_priority(value: str) -> TaskPriority:
    mapping = {
        "low": TaskPriority.low,
        "medium": TaskPriority.medium,
        "high": TaskPriority.high,
        "urgent": TaskPriority.urgent,
    }
    key = (value or "medium").lower()
    if key not in mapping:
        raise HTTPException(status_code=400, detail=f"Invalid task priority: {value}")
    return mapping[key]


def _serialize(task, creator_name: Optional[str] = None) -> dict:
    return {
        "id": task.id,
        "uuid": str(task.uuid),
        "title": task.title,
        "description": task.description,
        "status": str(task.status).replace("TaskStatus.", "").lower(),
        "priority": str(task.priority).replace("TaskPriority.", "").lower(),
        "due_date": task.dueDate,
        "assigned_to": task.assignedTo,
        "created_by": creator_name,
        "created_at": task.createdAt,
        "updated_at": task.updatedAt,
    }


class TaskService:
    @staticmethod
    async def list_tasks(limit: int = 100) -> List[dict]:
        db = await get_db()
        rows = await db.task.find_many(order={"updatedAt": "desc"}, take=limit)
        return [_serialize(t) for t in rows]

    @staticmethod
    async def create_task(data: dict, created_by_id: Optional[int] = None, creator_name: Optional[str] = None) -> dict:
        db = await get_db()
        task = await db.task.create(
            data={
                "title": data["title"],
                "description": data.get("description"),
                "status": _to_status(data.get("status", "todo")),
                "priority": _to_priority(data.get("priority", "medium")),
                "dueDate": data.get("due_date"),
                "assignedTo": data.get("assigned_to"),
                "createdById": created_by_id,
            }
        )
        return _serialize(task, creator_name)

    @staticmethod
    async def update_task(uuid: str, data: dict) -> dict:
        db = await get_db()
        existing = await db.task.find_first(where={"uuid": uuid})
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        payload = {}
        if data.get("title") is not None:
            payload["title"] = data["title"]
        if data.get("description") is not None:
            payload["description"] = data["description"]
        if data.get("status") is not None:
            payload["status"] = _to_status(data["status"])
        if data.get("priority") is not None:
            payload["priority"] = _to_priority(data["priority"])
        if "due_date" in data:
            payload["dueDate"] = data["due_date"]
        if data.get("assigned_to") is not None:
            payload["assignedTo"] = data["assigned_to"]
        updated = await db.task.update(where={"id": existing.id}, data=payload)
        return _serialize(updated)

    @staticmethod
    async def delete_task(uuid: str) -> dict:
        db = await get_db()
        existing = await db.task.find_first(where={"uuid": uuid})
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        await db.task.delete(where={"id": existing.id})
        return {"deleted_uuid": uuid, "title": existing.title}
