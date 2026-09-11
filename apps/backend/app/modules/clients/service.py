"""Client (Organization) service."""
from typing import Optional

from fastapi import HTTPException

from app.db.client import get_db
from app.db.prisma import Json
from app.modules.recruitment_fields.service import RecruitmentFieldsService


def _serialize(client, job_count: int = 0) -> dict:
    return {
        "id": client.id,
        "name": client.name,
        "logo_url": client.logoUrl,
        "location": client.location,
        "description": client.description,
        "custom_fields": client.customFields if client.customFields else None,
        "is_archived": client.isArchived,
        "job_count": job_count,
        "created_at": client.createdAt,
        "updated_at": client.updatedAt,
    }


class ClientService:
    @staticmethod
    async def list_clients(search: Optional[str] = None, archived: Optional[bool] = None) -> dict:
        db = await get_db()
        where: dict = {}
        if search:
            where["name"] = {"contains": search, "mode": "insensitive"}
        if archived is not None:
            where["isArchived"] = archived

        rows = await db.organization.find_many(where=where or None, order={"name": "asc"})
        jobs = await db.job.find_many()
        counts: dict = {}
        for job in jobs:
            if job.organizationId is not None:
                counts[job.organizationId] = counts.get(job.organizationId, 0) + 1
        clients = [_serialize(c, counts.get(c.id, 0)) for c in rows]
        return {"clients": clients, "total": len(clients)}

    @staticmethod
    async def get_client(client_id: int) -> dict:
        db = await get_db()
        client = await db.organization.find_first(where={"id": client_id})
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        job_count = await db.job.count(where={"organizationId": client_id})
        return _serialize(client, job_count)

    @staticmethod
    async def create_client(data: dict) -> dict:
        db = await get_db()
        custom = data.get("custom_fields")
        payload = {
            "name": data["name"],
            "logoUrl": data.get("logo_url"),
            "location": data.get("location"),
            "description": data.get("description"),
            "isArchived": data.get("is_archived", False),
        }
        if custom:
            payload["customFields"] = Json(
                await RecruitmentFieldsService.sanitize_custom_fields(db, "CLIENT", custom)
            )
        client = await db.organization.create(data=payload)
        return _serialize(client)

    @staticmethod
    async def update_client(client_id: int, data: dict) -> dict:
        db = await get_db()
        existing = await db.organization.find_first(where={"id": client_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Client not found")
        payload = {}
        for src, dest in (
            ("name", "name"),
            ("logo_url", "logoUrl"),
            ("location", "location"),
            ("description", "description"),
            ("is_archived", "isArchived"),
        ):
            if data.get(src) is not None:
                payload[dest] = data[src]
        if "custom_fields" in data:
            payload["customFields"] = Json(
                await RecruitmentFieldsService.sanitize_custom_fields(
                    db, "CLIENT", data.get("custom_fields") or {}
                ) or {}
            )
        client = await db.organization.update(where={"id": client_id}, data=payload)
        return _serialize(client)

    @staticmethod
    async def delete_client(client_id: int) -> dict:
        db = await get_db()
        existing = await db.organization.find_first(where={"id": client_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Client not found")
        job_count = await db.job.count(where={"organizationId": client_id})
        if job_count:
            raise HTTPException(
                status_code=409,
                detail=f"Cannot delete client with {job_count} job(s). Archive it instead.",
            )
        await db.organization.delete(where={"id": client_id})
        return {"deleted_id": client_id, "name": existing.name}