"""Public careers page service (no auth)."""
import json
import logging
import uuid as uuid_mod
from typing import Optional
from decimal import Decimal

from fastapi import HTTPException

from app.core.string_ids import sid
from app.core.storage import storage, validate_resume_file
from app.db.client import get_db
from app.db.prisma import Json
from app.modules.candidates.service import CandidateService
from app.modules.activities.service import create_event_activity
from app.modules.settings.service import SettingsService
from app.modules.recruitment_fields.schemas import RESERVED_PREFIX
from app.modules.recruitment_fields.service import (
    RecruitmentFieldsService,
    _coerce_value,
)

logger = logging.getLogger(__name__)

FIELD_MAP = {
    "full_name": "fullName",
    "email": "email",
    "phone": "phone",
    "location": "location",
    "current_position": "currentPosition",
    "current_company": "currentCompany",
    "experience": "experience",
    "expected_salary": "expectedSalary_any",
    "linkedin_url": "linkedinUrl",
    "description": "description",
    "source": "source",
}

STRING_FIELDS = {
    "full_name",
    "email",
    "phone",
    "location",
    "current_position",
    "current_company",
    "experience",
    "linkedin_url",
    "description",
}

_FIELD_TO_STORE = {
    "current_position": "currentPosition",
    "current_company": "currentCompany",
}

WEIGHTS = {
    "full_name": 4,
    "email": 4,
    "phone": 2,
    "location": 1,
    "current_position": 2,
    "current_company": 1,
    "experience": 2,
    "description": 1,
    "linkedin_url": 1,
}


def _jobj(job, org_name: Optional[str] = None) -> dict:
    return {
        "id": sid(job.id),
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
        "tags": job.tags if job.tags is not None else [],
        "organization_id": job.organizationId,
        "organization_name": org_name,
        "career_page_url": job.careerPageUrl,
        "created_at": job.createdAt,
    }


class CareersService:
    @staticmethod
    async def _settings(db) -> dict:
        try:
            return await SettingsService(db).get_settings("RECRUITMENT")
        except Exception as e:
            logger.warning("Could not load recruitment settings: %s", e)
            return {}

    @staticmethod
    async def settings() -> dict:
        db = await get_db()
        s = await CareersService._settings(db)
        form_fields = []
        try:
            form_fields = json.loads(s.get("apply_form_fields") or "[]")
        except json.JSONDecodeError:
            form_fields = []
        return {
            "enabled": (s.get("careers_page_enabled", "true").lower() == "true"),
            "company_name": s.get("company_name", ""),
            "company_logo_url": s.get("company_logo_url", ""),
            "careers_url": s.get("careers_url", "/careers"),
            "about_message": s.get("about_message", ""),
            "notification_email": s.get("notification_email", ""),
            "apply_form_fields": form_fields,
            "success_message": (
                s.get("apply_success_message") or "Application submitted successfully."
            ),
            "already_applied_message": (
                s.get("apply_already_applied_message")
                or "Your application has already been received."
            ),
            "resume_note": (
                s.get("apply_resume_note") or "Your resume was received successfully."
            ),
            "require_consent": (s.get("require_consent", "false").lower() == "true"),
            "consent_message": s.get("consent_message", ""),
            "privacy_policy_url": s.get("privacy_policy_url", ""),
            "custom_fields": await RecruitmentFieldsService.active_apply_fields(
                ["CANDIDATE"]
            ),
        }

    @staticmethod
    async def list_jobs() -> dict:
        db = await get_db()
        rows = await db.job.find_many(
            where={"isPublished": True},
            order={"createdAt": "desc"},
            include={"organization": True},
        )
        jobs = [
            _jobj(job, job.organization.name if job.organization else None)
            for job in rows
        ]
        return {"jobs": jobs, "total": len(jobs)}

    @staticmethod
    async def job_by_slug(slug: str) -> dict:
        db = await get_db()
        job = await db.job.find_first(
            where={"slug": slug},
            include={"organization": True},
        )
        if not job or not job.isPublished:
            raise HTTPException(status_code=404, detail="Job not found")
        return _jobj(job, job.organization.name if job.organization else None)

    @staticmethod
    async def apply(slug: str, form: dict, resume_file=None) -> dict:
        """Create/attach a candidate and match from a public application.

        `form` is a dict of string field -> value. `resume_file` is
        (filename, content_type, bytes) or None.
        """
        db = await get_db()
        s = await CareersService._settings(db)
        if s.get("careers_page_enabled", "true").lower() != "true":
            raise HTTPException(status_code=404, detail="Careers page is disabled")

        job = await db.job.find_first(where={"slug": slug})
        if not job or not job.isPublished:
            raise HTTPException(status_code=404, detail="Job not found")

        full_name = str(form.get("full_name", "")).strip()
        email = str(form.get("email", "")).strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="Full name is required")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        candidate_data = {k: (str(form.get(k, "")).strip() if form.get(k) else None) for k in STRING_FIELDS}
        consent = str(form.get("consent", "")).lower() in ("on", "true", "yes", "1")
        candidate_data["consent"] = consent or s.get("require_consent", "false").lower() != "true"
        candidate_data["email_consent"] = consent
        candidate_data["source"] = "Careers Page"

        # Route custom form fields (keys prefixed `cf_<code>`) to the candidate.
        active_custom = await db.recruitmentfield.find_many(
            where={
                "entity": "CANDIDATE",
                "isActive": True,
                "showInApply": True,
            }
        )
        custom_by_code = {d.code: d for d in active_custom}
        custom_candidate: dict = {}
        custom_answers: dict = {}
        for k, v in list(form.items()):
            if k.startswith(RESERVED_PREFIX):
                code = k[len(RESERVED_PREFIX):]
                d = custom_by_code.get(code)
                if not d:
                    continue
                coerced = _coerce_value(d.fieldType, v)
                custom_candidate[code] = coerced
        if custom_candidate:
            candidate_data["custom_fields"] = custom_candidate

        result = await CandidateService.get_or_create_by_email(db, candidate_data)
        candidate = result["candidate"]

        existing = await db.match.find_first(
            where={"candidateId": candidate.id, "jobId": job.id}
        )
        if not existing:
            stage = await db.jobpipelinestage.find_first(
                where={"pipelineId": job.pipelineId, "isFinal": False} if job.pipelineId else {"isFinal": False},
                order={"rank": "asc"},
            )
            if not stage:
                stage = await db.jobpipelinestage.find_first(order={"rank": "asc"})
            if not stage:
                raise HTTPException(status_code=400, detail="No pipeline configured")

            answers = {
                k: str(v)
                for k, v in form.items()
                if v
                and k not in STRING_FIELDS
                and k != "resume"
                and k != "consent"
                and not k.startswith(RESERVED_PREFIX)
            }
            answers = answers or None
            match_payload = {
                "candidateId": candidate.id,
                "jobId": job.id,
                "stageId": stage.id,
                "stageName": stage.name,
                "isActive": True,
                "source": "Careers Page",
            }
            if answers:
                match_payload["answers"] = Json(answers)
            match_row = await db.match.create(data=match_payload)
            await db.recruitmentlog.create(
                data={
                    "actorId": None,
                    "action": f"Applied via careers page to {job.title}",
                    "entityType": "candidate",
                    "entityId": candidate.id,
                    "candidateId": candidate.id,
                    "jobId": job.id,
                }
            )
            await create_event_activity(
                db,
                title=f"Applied via careers page to {job.title}",
                candidate_id=candidate.id,
                job_id=job.id,
            )
            already_applied = False
        else:
            already_applied = True

        uploaded = None
        if resume_file:
            filename, content_type, content = resume_file
            ext = validate_resume_file(filename, content_type, len(content))
            path = f"candidates/{candidate.id}/{uuid_mod.uuid4().hex}{ext}"
            await storage.upload(path, content, content_type)
            await db.candidate.update(
                where={"id": candidate.id},
                data={"resumeUrl": path, "resumeFileName": filename},
            )
            if not already_applied:
                await db.match.update(
                    where={"id": match_row.id},
                    data={"resumeUrl": path, "resumeFileName": filename},
                )
            uploaded = {"filename": filename}

        return {
            "created": result["created"] or (not already_applied),
            "already_applied": already_applied,
            "candidate_reference": candidate.reference,
            "candidate_id": sid(candidate.id),
            "job_id": sid(job.id),
            "resume_uploaded": bool(uploaded),
            "message": (
                "Your application has already been received."
                if already_applied
                else "Application submitted successfully."
            ),
        }