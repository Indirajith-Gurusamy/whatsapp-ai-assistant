"""Application (Match) service."""
from decimal import Decimal
import logging
from typing import Optional

import httpx
from fastapi import HTTPException, Response

from app.core.string_ids import sid, sid_opt
from app.core.storage import storage
from app.db.client import get_db
from app.db.prisma import Json
from app.modules.activities.service import create_event_activity

logger = logging.getLogger(__name__)


async def _serialize(match) -> dict:
    stage_name = match.stage.name if match.stage else match.stageName
    return {
        "id": sid(match.id),
        "candidate_id": sid(match.candidateId),
        "candidate_name": match.candidate.fullName if match.candidate else None,
        "candidate_reference": match.candidate.reference if match.candidate else None,
        "candidate_email": match.candidate.email if match.candidate else None,
        "candidate_phone": match.candidate.phone if match.candidate else None,
        "job_id": sid(match.jobId),
        "job_title": match.job.title if match.job else None,
        "organization_name": (
            match.job.organization.name if match.job and match.job.organization else None
        ),
        "stage_id": sid_opt(match.stageId),
        "stage_name": stage_name,
        "is_active": match.isActive,
        "match_score": float(match.matchScore) if match.matchScore is not None else None,
        "source": match.source,
        "answers": match.answers,
        "has_resume": bool(match.resumeUrl),
        "resume_file_name": match.resumeFileName,
        "created_at": match.createdAt,
        "updated_at": match.updatedAt,
    }


class ApplicationService:
    @staticmethod
    async def list_by_job(job_id: str) -> dict:
        db = await get_db()
        rows = await db.match.find_many(
            where={"jobId": job_id},
            order={"createdAt": "desc"},
            include={"candidate": True, "stage": True, "job": {"include": {"organization": True}}},
        )
        return {
            "applications": [await _serialize(m) for m in rows],
            "total": len(rows),
        }

    @staticmethod
    async def list_by_candidate(candidate_id: str) -> dict:
        db = await get_db()
        rows = await db.match.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"candidate": True, "stage": True, "job": {"include": {"organization": True}}},
        )
        return {
            "applications": [await _serialize(m) for m in rows],
            "total": len(rows),
        }

    @staticmethod
    async def _resolve_stage(db, job_id: str, stage_id: Optional[str]):
        if stage_id is None:
            pipeline = await db.jobpipeline.find_first(where={"isDefault": True})
            if not pipeline:
                from app.modules.jobs.service import JobService

                pipeline_data = await JobService.ensure_default_pipeline(db)
                pipeline_id = pipeline_data["pipeline_id"]
            else:
                pipeline_id = pipeline.id
            stage = await db.jobpipelinestage.find_first(
                where={"pipelineId": pipeline_id}, order={"rank": "asc"}
            )
            if not stage:
                raise HTTPException(status_code=400, detail="No pipeline stage available")
            return stage
        stage = await db.jobpipelinestage.find_first(where={"id": stage_id})
        if not stage:
            raise HTTPException(status_code=400, detail="Invalid stage")
        return stage

    @staticmethod
    async def create(data: dict) -> dict:
        db = await get_db()
        existing = await db.match.find_first(
            where={"candidateId": data["candidate_id"], "jobId": data["job_id"]}
        )
        if existing:
            raise HTTPException(status_code=409, detail="Candidate is already applied to this job")
        candidate = await db.candidate.find_first(where={"id": data["candidate_id"]})
        job = await db.job.find_first(where={"id": data["job_id"]})
        if not candidate or not job:
            raise HTTPException(status_code=404, detail="Candidate or job not found")
        stage = await ApplicationService._resolve_stage(db, data["job_id"], data.get("stage_id"))
        payload = {
            "candidateId": data["candidate_id"],
            "jobId": data["job_id"],
            "stageId": stage.id,
            "stageName": stage.name,
            "isActive": True,
            "source": data.get("source") or "Manual",
        }
        if data.get("answers"):
            payload["answers"] = Json(data["answers"])
        if data.get("match_score") is not None:
            payload["matchScore"] = Decimal(str(data["match_score"]))
        match = await db.match.create(data=payload)
        await db.recruitmentlog.create(
            data={
                "actorId": None,
                "action": f"Applied to {job.title}",
                "entityType": "candidate",
                "entityId": candidate.id,
                "candidateId": candidate.id,
                "jobId": job.id,
                "meta": Json({"stage": stage.name}),
            }
        )
        await create_event_activity(
            db,
            title=f"Applied to {job.title}",
            candidate_id=candidate.id,
            job_id=job.id,
        )
        return await ApplicationService.get(match.id)

    @staticmethod
    async def get(match_id: str) -> dict:
        db = await get_db()
        match = await db.match.find_first(
            where={"id": match_id},
            include={"candidate": True, "stage": True, "job": {"include": {"organization": True}}},
        )
        if not match:
            raise HTTPException(status_code=404, detail="Application not found")
        return await _serialize(match)

    @staticmethod
    async def update(match_id: str, data: dict) -> dict:
        db = await get_db()
        match = await db.match.find_first(where={"id": match_id}, include={"job": True})
        if not match:
            raise HTTPException(status_code=404, detail="Application not found")
        payload: dict = {}
        if data.get("stage_id") is not None and data["stage_id"] != match.stageId:
            stage = await db.jobpipelinestage.find_first(where={"id": data["stage_id"]})
            if not stage:
                raise HTTPException(status_code=400, detail="Invalid stage")
            payload["stageId"] = stage.id
            payload["stageName"] = stage.name
        if data.get("match_score") is not None:
            payload["matchScore"] = Decimal(str(data["match_score"]))
        if data.get("is_active") is not None:
            payload["isActive"] = data["is_active"]
        if data.get("source") is not None:
            payload["source"] = data["source"]
        if "answers" in data and data.get("answers") is not None:
            payload["answers"] = Json(data["answers"])
        if payload:
            await db.match.update(where={"id": match_id}, data=payload)
        if "stage_id" in payload and match.job:
            await db.recruitmentlog.create(
                data={
                    "actorId": None,
                    "action": f"Moved to stage: {payload['stageName']}",
                    "entityType": "job",
                    "entityId": match.jobId,
                    "candidateId": match.candidateId,
                    "jobId": match.jobId,
                    "meta": Json({"job_title": match.job.title}),
                }
            )
            await create_event_activity(
                db,
                title=f"Moved to stage: {payload['stageName']}",
                candidate_id=match.candidateId,
                job_id=match.jobId,
            )
        return await ApplicationService.get(match_id)

    @staticmethod
    async def stream_resume(application_id: str) -> Response:
        """Proxy the resume file for this application so the upstream URL stays hidden."""
        db = await get_db()
        match = await db.match.find_first(where={"id": application_id})
        if not match:
            raise HTTPException(status_code=404, detail="Application not found")
        if not match.resumeUrl:
            raise HTTPException(status_code=404, detail="Application has no resume")
        url = await storage.signed_url(match.resumeUrl)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            logger.error("Resume fetch failed: %s", resp.status_code)
            raise HTTPException(status_code=502, detail="Could not load resume from storage")
        safe_name = "".join(ch for ch in (match.resumeFileName or "resume.pdf") if ch not in '"\r\n')
        return Response(
            content=resp.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
        )

    @staticmethod
    async def delete(match_id: str) -> dict:
        db = await get_db()
        match = await db.match.find_first(where={"id": match_id})
        if not match:
            raise HTTPException(status_code=404, detail="Application not found")
        await db.match.delete(where={"id": match_id})
        return {"deleted_id": match_id}