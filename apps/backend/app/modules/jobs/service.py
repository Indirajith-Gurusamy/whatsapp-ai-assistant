"""Job service."""
import json
import logging
import re
import unicodedata
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException

from app.core.string_ids import sid
from app.db.client import get_db
from app.db.prisma import Json
from app.db.prisma.enums import JobStatus
from app.modules.settings.service import SettingsService
from app.modules.recruitment_fields.service import RecruitmentFieldsService

logger = logging.getLogger(__name__)


def _slugify(title: str) -> str:
    value = unicodedata.normalize("NFKD", title or "").encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value.lower()).strip("-")
    return value or "job"


def _to_status(value: Optional[str]) -> JobStatus:
    key = (value or "DRAFT").upper()
    if key not in ("DRAFT", "ACTIVE", "ARCHIVED"):
        raise HTTPException(status_code=400, detail=f"Invalid job status: {value}")
    return {
        "DRAFT": JobStatus.DRAFT,
        "ACTIVE": JobStatus.ACTIVE,
        "ARCHIVED": JobStatus.ARCHIVED,
    }[key]


def _enum_name(e) -> str:
    return str(e).split(".")[-1]


def _dec(value) -> Optional[Decimal]:
    if value is None:
        return None
    return Decimal(str(value))


def _serialize(
    job,
    org_name: Optional[str] = None,
    candidates_count: int = 0,
) -> dict:
    tags = job.tags if job.tags is not None else None
    return {
        "id": sid(job.id),
        "organization_id": job.organizationId,
        "organization_name": org_name,
        "title": job.title,
        "slug": job.slug,
        "description": job.description,
        "location": job.location,
        "is_remote": job.isRemote,
        "contract_type": job.contractType,
        "experience": job.experience,
        "salary_currency": job.salaryCurrency,
        "salary_min": float(job.salaryMin) if job.salaryMin is not None else None,
        "salary_max": float(job.salaryMax) if job.salaryMax is not None else None,
        "salary_frequency": job.salaryFrequency,
        "salary_negotiable": job.salaryNegotiable,
        "headcount": job.headcount,
        "tags": tags,
        "custom_fields": job.customFields if job.customFields else None,
        "status": _enum_name(job.status),
        "is_published": job.isPublished,
        "career_page_url": job.careerPageUrl,
        "candidates_count": candidates_count,
        "created_at": job.createdAt,
        "updated_at": job.updatedAt,
    }


class JobService:
    @staticmethod
    async def _default_stage_names(db) -> list:
        try:
            settings = await SettingsService(db).get_settings("RECRUITMENT")
            raw = settings.get("default_pipeline_stages") or "[]"
            stages = json.loads(raw)
            if isinstance(stages, list) and stages:
                return [str(s) for s in stages]
        except Exception as e:
            logger.warning("Could not load default pipeline stages: %s", e)
        return [
            "New candidates",
            "Shortlisted",
            "Under experience",
            "Over experience",
            "Client submission",
            "Client interview",
            "Offered",
            "Hired",
            "Probation passed",
        ]

    @staticmethod
    async def ensure_default_pipeline(db) -> dict:
        """Create the default pipeline if missing. Returns it with stages."""
        pipeline = await db.jobpipeline.find_first(where={"isDefault": True})
        if not pipeline:
            stage_names = await JobService._default_stage_names(db)
            pipeline = await db.jobpipeline.create(
                data={
                    "name": "Default Pipeline",
                    "isDefault": True,
                    "stages": {
                        "create": [
                            {"name": name, "rank": i, "isFinal": (i == len(stage_names) - 1)}
                            for i, name in enumerate(stage_names)
                        ]
                    },
                }
            )
            logger.info("Created default pipeline %s", pipeline.id)
        stages = await db.jobpipelinestage.find_many(
            where={"pipelineId": pipeline.id}, order={"rank": "asc"}
        )
        return {"pipeline_id": sid(pipeline.id), "pipeline_name": pipeline.name, "stages": stages}

    @staticmethod
    async def _make_slug(db, title: str) -> str:
        base = _slugify(title)
        slug = base
        n = 2
        while await db.job.count(where={"slug": slug}):
            slug = f"{base}-{n}"
            n += 1
        return slug

    @staticmethod
    async def list_jobs(
        search: Optional[str] = None,
        status: Optional[str] = None,
        organization_id: Optional[int] = None,
    ) -> dict:
        db = await get_db()
        where: dict = {}
        if search:
            where["title"] = {"contains": search, "mode": "insensitive"}
        if status:
            where["status"] = _to_status(status)
        if organization_id:
            where["organizationId"] = organization_id

        rows = await db.job.find_many(
            where=where or None,
            order={"createdAt": "desc"},
            include={"organization": True},
        )
        org_names = {}
        for job in rows:
            if job.organization and job.organizationId not in org_names:
                org_names[job.organizationId] = job.organization.name
        counts: dict = {}
        for job in rows:
            counts[job.id] = await db.match.count(where={"jobId": job.id})
        jobs = [
            _serialize(job, org_names.get(job.organizationId), counts.get(job.id, 0))
            for job in rows
        ]
        return {"jobs": jobs, "total": len(jobs)}

    @staticmethod
    async def get_job(job_id: str) -> dict:
        db = await get_db()
        job = await db.job.find_first(where={"id": job_id}, include={"organization": True})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        count = await db.match.count(where={"jobId": job_id})
        org_name = job.organization.name if job.organization else None
        return _serialize(job, org_name, count)

    @staticmethod
    async def create_job(data: dict) -> dict:
        db = await get_db()
        pipeline = await JobService.ensure_default_pipeline(db)
        slug = await JobService._make_slug(db, data["title"])
        payload = {
            "title": data["title"],
            "slug": slug,
            "organizationId": data.get("organization_id"),
            "description": data.get("description"),
            "location": data.get("location"),
            "isRemote": data.get("is_remote", False),
            "contractType": data.get("contract_type"),
            "experience": data.get("experience"),
            "salaryCurrency": data.get("salary_currency"),
            "salaryMin": _dec(data.get("salary_min")),
            "salaryMax": _dec(data.get("salary_max")),
            "salaryFrequency": data.get("salary_frequency"),
            "salaryNegotiable": data.get("salary_negotiable", False),
            "headcount": data.get("headcount", 1),
            "tags": Json((data.get("tags") or []) if isinstance(data.get("tags"), list) else []),
            "status": JobStatus.DRAFT,
            "isPublished": False,
            "careerPageUrl": None,
            "pipelineId": pipeline["pipeline_id"],
        }
        custom = await RecruitmentFieldsService.sanitize_custom_fields(
            db, "JOB", data.get("custom_fields")
        )
        if custom:
            payload["customFields"] = Json(custom)
        job = await db.job.create(data=payload)
        return await JobService.get_job(job.id)

    @staticmethod
    async def update_job(job_id: str, data: dict) -> dict:
        db = await get_db()
        existing = await db.job.find_first(where={"id": job_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")
        payload: dict = {}
        mappings = (
            ("title", "title"),
            ("organization_id", "organizationId"),
            ("description", "description"),
            ("location", "location"),
            ("contract_type", "contractType"),
            ("experience", "experience"),
            ("salary_currency", "salaryCurrency"),
            ("salary_frequency", "salaryFrequency"),
        )
        for src, dest in mappings:
            if data.get(src) is not None:
                payload[dest] = data[src]
        for src in ("is_remote", "salary_negotiable", "headcount"):
            if data.get(src) is not None:
                payload[{"is_remote": "isRemote", "salary_negotiable": "salaryNegotiable", "headcount": "headcount"}[src]] = data[src]
        if data.get("salary_min") is not None:
            payload["salaryMin"] = _dec(data["salary_min"])
        if data.get("salary_max") is not None:
            payload["salaryMax"] = _dec(data["salary_max"])
        if "tags" in data:
            payload["tags"] = Json(data["tags"] or [])
        if "custom_fields" in data:
            payload["customFields"] = Json(
                await RecruitmentFieldsService.sanitize_custom_fields(
                    db, "JOB", data.get("custom_fields") or {}
                ) or {}
            )
        if "status" in data and data["status"] is not None:
            new_status = _to_status(data["status"])
            payload["status"] = new_status
            if new_status == JobStatus.ARCHIVED:
                payload["isPublished"] = False
                payload["careerPageUrl"] = None
        await db.job.update(where={"id": job_id}, data=payload)
        return await JobService.get_job(job_id)

    @staticmethod
    async def delete_job(job_id: str) -> dict:
        db = await get_db()
        existing = await db.job.find_first(where={"id": job_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")
        await db.job.delete(where={"id": job_id})
        return {"deleted_id": job_id, "title": existing.title}

    @staticmethod
    async def set_published(job_id: str, is_published: bool) -> dict:
        db = await get_db()
        existing = await db.job.find_first(where={"id": job_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")
        if is_published:
            status = JobStatus.ACTIVE
            career_url = f"/careers/jobs/{existing.slug}"
        else:
            status = JobStatus.DRAFT
            career_url = None
        await db.job.update(
            where={"id": job_id},
            data={"isPublished": is_published, "status": status, "careerPageUrl": career_url},
        )
        return await JobService.get_job(job_id)

    @staticmethod
    async def _pipeline_for_job(db, job_id: str):
        """Resolve the pipeline a job belongs to. Returns (pipeline_id, pipeline_name, stages)."""
        job = await db.job.find_first(where={"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not job.pipelineId:
            pipeline = await JobService.ensure_default_pipeline(db)
            await db.job.update(
                where={"id": job_id}, data={"pipelineId": pipeline["pipeline_id"]}
            )
            return pipeline["pipeline_id"], pipeline["pipeline_name"], pipeline["stages"]
        pipeline = await db.jobpipeline.find_first(where={"id": job.pipelineId})
        if not pipeline:
            pipeline = await JobService.ensure_default_pipeline(db)
            await db.job.update(
                where={"id": job_id}, data={"pipelineId": pipeline["pipeline_id"]}
            )
            return pipeline["pipeline_id"], pipeline["pipeline_name"], pipeline["stages"]
        stages = await db.jobpipelinestage.find_many(
            where={"pipelineId": pipeline.id}, order={"rank": "asc"}
        )
        return pipeline.id, pipeline.name, stages

    @staticmethod
    async def get_pipeline(job_id: str) -> dict:
        db = await get_db()
        pipeline_id, pipeline_name, stages = await JobService._pipeline_for_job(db, job_id)
        result = []
        for stage in stages:
            count = await db.match.count(
                where={"jobId": job_id, "stageId": stage.id, "isActive": True}
            )
            result.append(
                {
                    "id": sid(stage.id),
                    "name": stage.name,
                    "rank": stage.rank,
                    "is_final": stage.isFinal,
                    "candidates_count": count,
                }
            )
        return {"pipeline_id": sid(pipeline_id), "pipeline_name": pipeline_name, "stages": result}

    @staticmethod
    async def add_stage(job_id: str, name: str) -> dict:
        db = await get_db()
        pipeline_id, _, stages = await JobService._pipeline_for_job(db, job_id)
        name = (name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Stage name is required")
        duplicate = await db.jobpipelinestage.find_first(
            where={
                "pipelineId": pipeline_id,
                "name": {"equals": name, "mode": "insensitive"},
            }
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="A stage with that name already exists")
        next_rank = (stages[-1].rank + 1) if stages else 0
        stage = await db.jobpipelinestage.create(
            data={
                "pipelineId": pipeline_id,
                "name": name,
                "rank": next_rank,
                "isFinal": False,
            }
        )
        return {
            "id": sid(stage.id),
            "name": stage.name,
            "rank": stage.rank,
            "is_final": stage.isFinal,
            "candidates_count": 0,
        }

    @staticmethod
    async def remove_stage(job_id: str, stage_id: str) -> dict:
        db = await get_db()
        pipeline_id, _, _ = await JobService._pipeline_for_job(db, job_id)
        stage = await db.jobpipelinestage.find_first(
            where={"id": stage_id, "pipelineId": pipeline_id}
        )
        if not stage:
            raise HTTPException(status_code=404, detail="Stage not found")
        moved_result = await db.match.update_many(
            where={"stageId": stage_id},
            data={"stageId": None, "stageName": None},
        )
        moved = moved_result if isinstance(moved_result, int) else getattr(moved_result, "count", 0)
        await db.jobpipelinestage.delete(where={"id": stage_id})
        return {
            "deleted_id": stage_id,
            "name": stage.name,
            "moved_candidates": moved,
        }

    @staticmethod
    async def reconcile_default_stages(stage_names: list) -> dict:
        """Make the default pipeline's stages match `stage_names`.

        Adds missing stages, removes ones no longer present, and fixes
        rank/`isFinal` so the pipeline mirrors the settings value.
        """
        db = await get_db()
        pipeline = await JobService.ensure_default_pipeline(db)
        pipeline_id = pipeline["pipeline_id"]
        existing_rows = await db.jobpipelinestage.find_many(
            where={"pipelineId": pipeline_id}, order={"rank": "asc"}
        )
        existing_by_name = {}
        for s in existing_rows:
            existing_by_name[s.name.strip().lower()] = s

        names = [str(n).strip() for n in stage_names if str(n).strip()]
        added = 0
        removed = 0
        rank = 0
        for name in names:
            stage = existing_by_name.pop(name.lower(), None)
            is_final = rank == len(names) - 1
            if stage:
                if stage.rank != rank or stage.isFinal != is_final:
                    await db.jobpipelinestage.update(
                        where={"id": stage.id},
                        data={"rank": rank, "isFinal": is_final},
                    )
            else:
                await db.jobpipelinestage.create(
                    data={
                        "pipelineId": pipeline_id,
                        "name": name,
                        "rank": rank,
                        "isFinal": is_final,
                    }
                )
                added += 1
            rank += 1

        for leftover in existing_by_name.values():
            await db.match.update_many(
                where={"stageId": leftover.id},
                data={"stageId": None, "stageName": None},
            )
            await db.jobpipelinestage.delete(where={"id": leftover.id})
            removed += 1

        return {"added": added, "removed": removed, "total": len(names)}

    @staticmethod
    async def get_default_pipeline() -> dict:
        db = await get_db()
        pipeline = await JobService.ensure_default_pipeline(db)
        stages = [
            {
                "id": sid(s.id),
                "name": s.name,
                "rank": s.rank,
                "is_final": s.isFinal,
            }
            for s in pipeline["stages"]
        ]
        return {
            "pipeline_id": sid(pipeline["pipeline_id"]),
            "pipeline_name": pipeline["pipeline_name"],
            "stages": stages,
        }