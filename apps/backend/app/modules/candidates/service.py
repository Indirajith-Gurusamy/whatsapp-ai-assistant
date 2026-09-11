"""Candidate service."""
import json
import logging
import random
import string
import uuid as uuid_mod
from typing import Optional

import httpx
from fastapi import HTTPException, Response

from app.core.string_ids import sid, sid_opt
from app.core.storage import storage, validate_resume_file
from app.db.client import get_db
from app.db.prisma import Json
from app.modules.activities.service import create_event_activity
from app.modules.recruitment_fields.service import RecruitmentFieldsService

logger = logging.getLogger(__name__)


def _build_where(search: Optional[str], job_id: Optional[str]) -> dict:
    where: dict = {}
    if search:
        where["OR"] = [
            {"fullName": {"contains": search, "mode": "insensitive"}},
            {"email": {"contains": search, "mode": "insensitive"}},
            {"phone": {"contains": search, "mode": "insensitive"}},
            {"currentCompany": {"contains": search, "mode": "insensitive"}},
        ]
    if job_id:
        where["matches"] = {"some": {"jobId": job_id}}
    return where


async def _serialize(candidate, ctx: Optional[dict] = None) -> dict:
    ctx = ctx or {}
    app_counts = ctx.get("application_counts", {})
    return {
        "id": sid(candidate.id),
        "reference": candidate.reference,
        "full_name": candidate.fullName,
        "email": candidate.email,
        "phone": candidate.phone,
        "gender": candidate.gender,
        "birth_date": candidate.birthDate,
        "location": candidate.location,
        "current_company": candidate.currentCompany,
        "current_position": candidate.currentPosition,
        "experience": candidate.experience,
        "notice_period": candidate.noticePeriod,
        "last_working_day": candidate.lastWorkingDay,
        "expected_salary": candidate.expectedSalary if candidate.expectedSalary else None,
        "current_salary": candidate.currentSalary if candidate.currentSalary else None,
        "linkedin_url": candidate.linkedinUrl,
        "source": candidate.source,
        "description": candidate.description,
        "skills": candidate.skills if candidate.skills else None,
        "custom_fields": candidate.customFields if candidate.customFields else None,
        "resume_url": candidate.resumeUrl,
        "resume_file_name": candidate.resumeFileName,
        "applications_count": app_counts.get(candidate.id, 0),
        "created_at": candidate.createdAt,
        "updated_at": candidate.updatedAt,
    }


class CandidateService:
    @staticmethod
    async def list_candidates(
        search: Optional[str] = None,
        job_id: Optional[str] = None,
        page: int = 1,
        limit: int = 25,
    ) -> dict:
        db = await get_db()
        where = _build_where(search, job_id)
        total = await db.candidate.count(where=where or None)
        rows = await db.candidate.find_many(
            where=where or None,
            order={"createdAt": "desc"},
            skip=(page - 1) * limit if page > 1 else None,
            take=limit,
        )
        ids = [c.id for c in rows]
        app_counts: dict = {}
        if ids:
            matches = await db.match.find_many(where={"candidateId": {"in": ids}})
            for m in matches:
                app_counts[m.candidateId] = app_counts.get(m.candidateId, 0) + 1
        candidates = [await _serialize(c, {"application_counts": app_counts}) for c in rows]
        return {"candidates": candidates, "total": total}

    @staticmethod
    async def get_candidate(candidate_id: str) -> dict:
        db = await get_db()
        candidate = await db.candidate.find_first(where={"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        context = await CandidateService._detail_context(db, candidate_id)
        detail = await _serialize(candidate, context)
        detail["notes"] = context["notes"]
        detail["attachments"] = context["attachments"]
        detail["logs"] = context["logs"]
        detail["activities"] = context["activities"]
        detail["applications"] = context["applications"]
        detail["folders"] = context["folders"]
        return detail

    @staticmethod
    async def _detail_context(db, candidate_id: str) -> dict:
        notes = await db.note.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"author": True},
        )
        attachments = await db.attachment.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
        )
        logs = await db.recruitmentlog.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"actor": True},
        )
        activities = await db.activity.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"assignee": True},
        )
        matches = await db.match.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"job": {"include": {"organization": True}}, "stage": True},
        )
        folders_rows = await db.candidatefolder.find_many(
            where={"candidateId": candidate_id}, include={"folder": True}
        )
        app_counts = {candidate_id: len(matches)}
        return {
            "application_counts": app_counts,
            "notes": [
                {
                    "id": sid(n.id),
                    "content": n.content,
                    "author_id": n.authorId,
                    "author_name": n.author.name if n.author else None,
                    "created_at": n.createdAt,
                }
                for n in notes
            ],
            "attachments": [
                {
                    "id": sid(a.id),
                    "file_url": a.fileUrl,
                    "file_name": a.fileName,
                    "mime_type": a.mimeType,
                    "signed_url": None,
                    "created_at": a.createdAt,
                }
                for a in attachments
            ],
            "logs": [
                {
                    "id": sid(log.id),
                    "action": log.action,
                    "entity_type": log.entityType,
                    "entity_id": sid(log.entityId) if log.entityId is not None else None,
                    "actor_name": log.actor.name if log.actor else None,
                    "meta": log.meta,
                    "created_at": log.createdAt,
                }
                for log in logs
            ],
            "activities": [
                {
                    "id": sid(act.id),
                    "title": act.title,
                    "activity_type": act.activityType,
                    "description": act.description,
                    "assignee_id": act.assigneeId,
                    "assignee_name": act.assignee.name if act.assignee else None,
                    "job_id": sid_opt(act.jobId),
                    "due_date": act.dueDate,
                    "is_done": act.isDone,
                    "created_at": act.createdAt,
                }
                for act in activities
            ],
            "applications": [
                {
                    "id": sid(m.id),
                    "job_id": sid(m.jobId),
                    "job_title": m.job.title if m.job else None,
                    "organization_id": m.job.organizationId if m.job else None,
                    "organization_name": (
                        m.job.organization.name if m.job and m.job.organization else None
                    ),
                    "stage_id": sid_opt(m.stageId),
                    "stage_name": m.stage.name if m.stage else m.stageName,
                    "is_active": m.isActive,
                    "match_score": float(m.matchScore) if m.matchScore is not None else None,
                    "source": m.source,
                    "created_at": m.createdAt,
                    "updated_at": m.updatedAt,
                }
                for m in matches
            ],
            "folders": [
                {"id": sid(cf.folder.id), "name": cf.folder.name} for cf in folders_rows
            ],
        }

    @staticmethod
    async def create_candidate(data: dict, reference: Optional[str] = None) -> dict:
        db = await get_db()
        reference = reference or await CandidateService._next_reference(db)
        payload = {
            "reference": reference,
            "fullName": data["full_name"],
            "email": data.get("email"),
            "phone": data.get("phone"),
            "gender": data.get("gender"),
            "birthDate": data.get("birth_date"),
            "location": data.get("location"),
            "currentCompany": data.get("current_company"),
            "currentPosition": data.get("current_position"),
            "experience": data.get("experience"),
            "noticePeriod": data.get("notice_period"),
            "lastWorkingDay": data.get("last_working_day"),
            "linkedinUrl": data.get("linkedin_url"),
            "source": data.get("source"),
            "description": data.get("description"),
        }
        if data.get("expected_salary") is not None:
            payload["expectedSalary"] = Json(data["expected_salary"])
        if data.get("current_salary") is not None:
            payload["currentSalary"] = Json(data["current_salary"])
        if data.get("skills") is not None:
            payload["skills"] = Json(data["skills"])
        custom = await RecruitmentFieldsService.sanitize_custom_fields(
            db, "CANDIDATE", data.get("custom_fields")
        )
        if custom:
            payload["customFields"] = Json(custom)
        candidate = await db.candidate.create(data=payload)
        await db.recruitmentlog.create(
            data={
                "actorId": None,
                "action": "Candidate created",
                "entityType": "candidate",
                "entityId": candidate.id,
                "candidateId": candidate.id,
            }
        )
        await create_event_activity(
            db,
            title=f"Candidate created: {candidate.fullName or candidate.email or candidate.id}",
            candidate_id=candidate.id,
        )
        return await CandidateService.get_candidate(candidate.id)

    @staticmethod
    async def _next_reference(db) -> str:
        for _ in range(10):
            ref = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
            exists = await db.candidate.count(where={"reference": ref})
            if not exists:
                return ref
        raise HTTPException(status_code=500, detail="Could not generate candidate reference")

    @staticmethod
    async def get_or_create_by_email(db, data: dict) -> dict:
        """Used by the public careers page — find by email or create."""
        email = data.get("email")
        if email:
            existing = await db.candidate.find_first(
                where={"email": {"equals": email, "mode": "insensitive"}}
            )
            if existing:
                custom = data.get("custom_fields")
                if custom:
                    try:
                        sanitized = await RecruitmentFieldsService.sanitize_custom_fields(
                            db, "CANDIDATE", custom
                        )
                        if sanitized:
                            merged = dict(existing.customFields or {})
                            merged.update(sanitized)
                            await db.candidate.update(
                                where={"id": existing.id},
                                data={"customFields": Json(merged)},
                            )
                    except Exception:
                        pass
                return {"candidate": existing, "created": False}
        reference = await CandidateService._next_reference(db)
        payload = {
            "reference": reference,
            "fullName": data.get("full_name") or "Unknown",
            "email": email,
            "phone": data.get("phone"),
            "location": data.get("location"),
            "currentCompany": data.get("current_company"),
            "currentPosition": data.get("current_position"),
            "experience": data.get("experience"),
            "linkedinUrl": data.get("linkedin_url"),
            "description": data.get("description"),
            "source": data.get("source") or "Careers Page",
            "consent": bool(data.get("consent")),
            "emailConsent": bool(data.get("email_consent")),
        }
        if data.get("expected_salary"):
            payload["expectedSalary"] = Json({"text": data.get("expected_salary")})
        custom = data.get("custom_fields")
        if custom:
            sanitized = await RecruitmentFieldsService.sanitize_custom_fields(
                db, "CANDIDATE", custom
            )
            if sanitized:
                payload["customFields"] = Json(sanitized)
        candidate = await db.candidate.create(data=payload)
        await db.recruitmentlog.create(
            data={
                "actorId": None,
                "action": "Candidate created via careers page",
                "entityType": "candidate",
                "entityId": candidate.id,
                "candidateId": candidate.id,
            }
        )
        await create_event_activity(
            db,
            title=f"Candidate created via careers page: {candidate.fullName or candidate.email or candidate.id}",
            candidate_id=candidate.id,
        )
        return {"candidate": candidate, "created": True}

    @staticmethod
    async def update_candidate(candidate_id: str, data: dict) -> dict:
        db = await get_db()
        existing = await db.candidate.find_first(where={"id": candidate_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Candidate not found")
        payload: dict = {}
        mappings = (
            ("full_name", "fullName"),
            ("email", "email"),
            ("phone", "phone"),
            ("gender", "gender"),
            ("birth_date", "birthDate"),
            ("location", "location"),
            ("current_company", "currentCompany"),
            ("current_position", "currentPosition"),
            ("experience", "experience"),
            ("notice_period", "noticePeriod"),
            ("last_working_day", "lastWorkingDay"),
            ("linkedin_url", "linkedinUrl"),
            ("source", "source"),
            ("description", "description"),
        )
        for src, dest in mappings:
            if data.get(src) is not None:
                payload[dest] = data[src]
        for src in ("expected_salary", "current_salary"):
            if data.get(src) is not None:
                payload[{"expected_salary": "expectedSalary", "current_salary": "currentSalary"}[src]] = (
                    Json(data[src])
                )
        if "skills" in data:
            payload["skills"] = Json(data.get("skills") or [])
        if "custom_fields" in data:
            payload["customFields"] = Json(
                await RecruitmentFieldsService.sanitize_custom_fields(
                    db, "CANDIDATE", data.get("custom_fields") or {}
                ) or {}
            )
        await db.candidate.update(where={"id": candidate_id}, data=payload)
        return await CandidateService.get_candidate(candidate_id)

    @staticmethod
    async def delete_candidate(candidate_id: str) -> dict:
        db = await get_db()
        existing = await db.candidate.find_first(where={"id": candidate_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Candidate not found")
        await db.candidate.delete(where={"id": candidate_id})
        return {"deleted_id": candidate_id, "full_name": existing.fullName}

    @staticmethod
    async def upload_resume(
        candidate_id: str,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> dict:
        db = await get_db()
        candidate = await db.candidate.find_first(where={"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        ext = validate_resume_file(filename, content_type, len(content))
        path = f"candidates/{candidate_id or 'new'}/{uuid_mod.uuid4().hex}{ext}"
        await storage.upload(path, content, content_type)
        await db.candidate.update(
            where={"id": candidate_id},
            data={"resumeUrl": path, "resumeFileName": filename},
        )
        download_url = await storage.signed_url(path)
        return {"resume_url": path, "resume_file_name": filename, "download_url": download_url}

    @staticmethod
    async def resume_url(candidate_id: str) -> dict:
        db = await get_db()
        candidate = await db.candidate.find_first(where={"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if not candidate.resumeUrl:
            raise HTTPException(status_code=404, detail="Candidate has no resume")
        url = await storage.signed_url(candidate.resumeUrl)
        return {"url": url}

    @staticmethod
    async def stream_resume(candidate_id: str) -> Response:
        """Proxy the resume file from storage so the upstream URL stays hidden."""
        db = await get_db()
        candidate = await db.candidate.find_first(where={"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if not candidate.resumeUrl:
            raise HTTPException(status_code=404, detail="Candidate has no resume")
        url = await storage.signed_url(candidate.resumeUrl)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            logger.error("Resume fetch failed: %s", resp.status_code)
            raise HTTPException(status_code=502, detail="Could not load resume from storage")
        safe_name = "".join(ch for ch in (candidate.resumeFileName or "resume.pdf") if ch not in '"\r\n')
        return Response(
            content=resp.content,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
        )

    # ── Notes ─────────────────────────────────────────

    @staticmethod
    async def list_notes(candidate_id: str) -> list:
        db = await get_db()
        notes = await db.note.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"author": True},
        )
        return [
            {
                    "id": sid(n.id),
                "content": n.content,
                "author_id": n.authorId,
                "author_name": n.author.name if n.author else None,
                "created_at": n.createdAt,
            }
            for n in notes
        ]

    @staticmethod
    async def create_note(candidate_id: str, content: str, author_id: int, author_name: str) -> dict:
        db = await get_db()
        note = await db.note.create(
            data={
                "content": content,
                "authorId": author_id,
                "candidateId": candidate_id,
            }
        )
        await db.recruitmentlog.create(
            data={
                "actorId": author_id,
                "action": f"Note added by {author_name}",
                "entityType": "candidate",
                "entityId": candidate_id,
                "candidateId": candidate_id,
            }
        )
        await create_event_activity(
            db,
            title=f"Note added by {author_name}",
            candidate_id=candidate_id,
        )
        return {
            "id": sid(note.id),
            "content": note.content,
            "author_id": author_id,
            "author_name": author_name,
            "created_at": note.createdAt,
        }

    @staticmethod
    async def delete_note(note_id: str) -> dict:
        db = await get_db()
        note = await db.note.find_first(where={"id": note_id})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        await db.note.delete(where={"id": note_id})
        return {"deleted_id": note_id}

    # ── Attachments ───────────────────────────────────

    @staticmethod
    async def list_attachments(candidate_id: str) -> list:
        db = await get_db()
        rows = await db.attachment.find_many(
            where={"candidateId": candidate_id}, order={"createdAt": "desc"}
        )
        result = []
        for a in rows:
            signed_url = None
            try:
                signed_url = await storage.signed_url(a.fileUrl)
            except Exception as e:
                logger.warning("Could not sign attachment %s: %s", a.id, e)
            result.append(
                {
                    "id": sid(a.id),
                    "file_url": a.fileUrl,
                    "file_name": a.fileName,
                    "mime_type": a.mimeType,
                    "signed_url": signed_url,
                    "created_at": a.createdAt,
                }
            )
        return result

    @staticmethod
    async def create_attachment(candidate_id: str, filename: str, content_type: str, content: bytes) -> dict:
        db = await get_db()
        ext = validate_resume_file(filename, content_type, len(content))
        path = f"attachments/candidate-{candidate_id}/{uuid_mod.uuid4().hex}{ext}"
        await storage.upload(path, content, content_type)
        attachment = await db.attachment.create(
            data={
                "fileUrl": path,
                "fileName": filename,
                "mimeType": content_type,
                "candidateId": candidate_id,
            }
        )
        signed_url = await storage.signed_url(path)
        return {
            "id": sid(attachment.id),
            "file_url": path,
            "file_name": filename,
            "mime_type": content_type,
            "signed_url": signed_url,
            "created_at": attachment.createdAt,
        }

    @staticmethod
    async def delete_attachment(attachment_id: str) -> dict:
        db = await get_db()
        attachment = await db.attachment.find_first(where={"id": attachment_id})
        if not attachment:
            raise HTTPException(status_code=404, detail="Attachment not found")
        await storage.delete(attachment.fileUrl)
        await db.attachment.delete(where={"id": attachment_id})
        return {"deleted_id": attachment_id}

    # ── Logs ──────────────────────────────────────────

    @staticmethod
    async def list_logs(candidate_id: str) -> list:
        db = await get_db()
        logs = await db.recruitmentlog.find_many(
            where={"candidateId": candidate_id},
            order={"createdAt": "desc"},
            include={"actor": True},
        )
        return [
            {
                "id": sid(log.id),
                "action": log.action,
                "entity_type": log.entityType,
                "entity_id": sid(log.entityId) if log.entityId is not None else None,
                "actor_name": log.actor.name if log.actor else None,
                "meta": log.meta,
                "created_at": log.createdAt,
            }
            for log in logs
        ]

    # ── Folders ───────────────────────────────────────

    @staticmethod
    async def list_folders() -> list:
        db = await get_db()
        folders = await db.folder.find_many(order={"name": "asc"})
        rows = await db.candidatefolder.find_many()
        counts: dict = {}
        for row in rows:
            counts[row.folderId] = counts.get(row.folderId, 0) + 1
        return [
            {"id": sid(f.id), "name": f.name, "candidate_count": counts.get(f.id, 0), "created_at": f.createdAt}
            for f in folders
        ]

    @staticmethod
    async def create_folder(name: str) -> dict:
        db = await get_db()
        folder = await db.folder.create(data={"name": name})
        return {"id": sid(folder.id), "name": folder.name, "candidate_count": 0, "created_at": folder.createdAt}

    @staticmethod
    async def add_to_folder(candidate_id: str, folder_id: str) -> dict:
        db = await get_db()
        try:
            await db.candidatefolder.create(data={"candidateId": candidate_id, "folderId": folder_id})
        except Exception:
            await db.candidatefolder.update(
                where={"folderId_candidateId": {"folderId": folder_id, "candidateId": candidate_id}},
                data={},
            )
        return {"candidate_id": candidate_id, "folder_id": folder_id}

    @staticmethod
    async def remove_from_folder(candidate_id: str, folder_id: str) -> dict:
        db = await get_db()
        await db.candidatefolder.delete(
            where={"folderId_candidateId": {"folderId": folder_id, "candidateId": candidate_id}}
        )
        return {"candidate_id": candidate_id, "folder_id": folder_id}