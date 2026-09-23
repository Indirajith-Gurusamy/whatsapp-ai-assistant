"""Activity (interview) service."""
import logging
from typing import Optional

from fastapi import HTTPException

from app.core.string_ids import sid, sid_opt
from app.db.client import get_db

logger = logging.getLogger(__name__)


async def create_event_activity(
    db,
    *,
    title: str,
    activity_type: str = "task",
    candidate_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> None:
    """Auto-create an Activity row from a recruitment event.

    Non-fatal by design: a failed auto-activity must never break the
    operation that triggered it (e.g. applying to a job, moving stages).
    """
    try:
        await db.activity.create(
            data={
                "title": title,
                "activityType": activity_type,
                "assigneeId": None,
                "candidateId": candidate_id,
                "jobId": job_id,
                "dueDate": None,
                "isDone": False,
            }
        )
    except Exception as e:
        logger.warning("Failed to auto-create activity (%s): %s", title, e)


async def _serialize(activity) -> dict:
    return {
        "id": sid(activity.id),
        "title": activity.title,
        "activity_type": activity.activityType,
        "description": activity.description,
        "assignee_id": activity.assigneeId,
        "assignee_name": activity.assignee.name if activity.assignee else None,
        "candidate_id": sid_opt(activity.candidateId),
        "candidate_name": activity.candidate.fullName if activity.candidate else None,
        "job_id": sid_opt(activity.jobId),
        "job_title": activity.job.title if activity.job else None,
        "due_date": activity.dueDate,
        "is_done": activity.isDone,
        "created_at": activity.createdAt,
        "updated_at": activity.updatedAt,
    }


class ActivityService:
    @staticmethod
    async def list_activities(
        job_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
        assignee_id: Optional[int] = None,
        is_done: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        db = await get_db()
        where: dict = {}
        if job_id:
            where["jobId"] = job_id
        if candidate_id:
            where["candidateId"] = candidate_id
        if assignee_id:
            where["assigneeId"] = assignee_id
        if is_done is not None:
            where["isDone"] = is_done
        total = await db.activity.count(where=where or None)
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        rows = await db.activity.find_many(
            where=where or None,
            order={"createdAt": "desc"},
            include={"assignee": True, "candidate": True, "job": True},
            skip=(page - 1) * page_size,
            take=page_size,
        )
        return {
            "activities": [await _serialize(a) for a in rows],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    @staticmethod
    async def create(data: dict) -> dict:
        db = await get_db()
        activity = await db.activity.create(
            data={
                "title": data["title"],
                "activityType": data.get("activity_type", "interview"),
                "description": data.get("description"),
                "assigneeId": data.get("assignee_id"),
                "candidateId": data.get("candidate_id"),
                "jobId": data.get("job_id"),
                "dueDate": data.get("due_date"),
                "isDone": data.get("is_done", False),
            }
        )
        candidate_id = data.get("candidate_id")
        if candidate_id:
            await db.recruitmentlog.create(
                data={
                    "actorId": None,
                    "action": f"Activity added: {data.get('activity_type', 'interview')} - {data['title']}",
                    "entityType": "candidate",
                    "entityId": candidate_id,
                    "candidateId": candidate_id,
                    "jobId": data.get("job_id"),
                }
            )
        return await ActivityService.get(activity.id)

    @staticmethod
    async def get(activity_id: str) -> dict:
        db = await get_db()
        activity = await db.activity.find_first(
            where={"id": activity_id},
            include={"assignee": True, "candidate": True, "job": True},
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return await _serialize(activity)

    @staticmethod
    async def update(activity_id: str, data: dict) -> dict:
        db = await get_db()
        existing = await db.activity.find_first(where={"id": activity_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Activity not found")
        payload: dict = {}
        mappings = (
            ("title", "title"),
            ("activity_type", "activityType"),
            ("description", "description"),
            ("assignee_id", "assigneeId"),
            ("candidate_id", "candidateId"),
            ("job_id", "jobId"),
            ("due_date", "dueDate"),
            ("is_done", "isDone"),
        )
        for src, dest in mappings:
            if data.get(src) is not None:
                payload[dest] = data[src]
        if payload:
            await db.activity.update(where={"id": activity_id}, data=payload)
        return await ActivityService.get(activity_id)

    @staticmethod
    async def delete(activity_id: str) -> dict:
        db = await get_db()
        activity = await db.activity.find_first(where={"id": activity_id})
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        await db.activity.delete(where={"id": activity_id})
        return {"deleted_id": activity_id}