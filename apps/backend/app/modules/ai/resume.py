"""Resume parsing and AI screening for recruitment.

Parses resumes (PDF / DOCX / TXT) and scores candidates against a job using
the same active AI provider configured under Settings → AI. Results are stored
inside the application's existing `answers` JSON under a reserved `__ai` key
and mirrored into `matchScore`, so no schema change is required.
"""
import io
import json
import logging
import re
import zipfile
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from xml.etree import ElementTree as ET

import httpx
from fastapi import HTTPException

from app.core.storage import storage
from app.db.client import get_db
from app.db.prisma import Json
from app.modules.activities.service import create_event_activity
from app.modules.ai.chat import complete_chat, format_ai_error
from app.modules.ai.providers_util import get_active_provider
from app.modules.ai.service import AIService

logger = logging.getLogger(__name__)

RAW_TEXT_CHAR_LIMIT = 40000

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

AiJson = Dict[str, Any]

PROFILE_SCHEMA = (
    "full_name, email, phone, location, current_position, current_company, "
    "experience_years, notice_period, linkedin_url, education, languages "
    "(array of strings), skills (array of strings), summary"
)

PARSE_SYSTEM_PROMPT = (
    "You are an expert recruitment AI. Extract structured information from the "
    "candidate resume. Return ONLY a valid JSON object with no markdown code "
    "fences, using exactly these keys:\n"
    + PROFILE_SCHEMA
    + "\nValues you cannot determine must be null (or an empty array for "
    "languages/skills). experience_years must be a number or null."
)

SCREEN_SYSTEM_PROMPT = (
    "You are an expert recruitment analyst. Compare the candidate's resume "
    "against the provided job description and return ONLY a valid JSON object "
    "with no markdown code fences, shaped exactly as follows:\n"
    + '{"profile": {' + PROFILE_SCHEMA + "}, "
    + '"match": {"score": integer 0-100, "recommendation": one of '
    + '"Strong Match", "Consider", "Weak Match", "Reject", '
    + '"summary": "2-3 sentence overview", "strengths": [strings], '
    + '"concerns": [strings]}}\n'
    + "Scoring rubric: 10% contact info present, 20% required skills overlap, "
    "20% experience match, 15% education, 10% location / remote / notice fit, "
    "10% contract and salary fit, 15% hiring risk (job-hopping, gaps, "
    "over/under-qualification). Be fair and precise."
)


def recommendation_for(score: Optional[float]) -> str:
    if score is None:
        return "Not screened"
    if score >= 80:
        return "Strong Match"
    if score >= 60:
        return "Consider"
    if score >= 40:
        return "Weak Match"
    return "Reject"


def has_screening(match) -> bool:
    """True when a Match already has an AI screening stored under answers.__ai."""
    answers = match.answers if isinstance(match.answers, dict) else {}
    ai = answers.get("__ai") if isinstance(answers, dict) else None
    return isinstance(ai, dict) and isinstance(ai.get("screening"), dict)


def extract_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            parsed = json.loads(text[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass
    raise ValueError("AI returned malformed JSON")


def extract_text_from_resume(content: bytes, filename: str) -> str:
    """Extract plain text from a resume (PDF / DOCX / TXT)."""
    name = (filename or "").lower()
    if name.endswith((".txt", ".md", ".csv")) or name.endswith(".pdf") or name.endswith(".docx"):
        pass
    else:
        raise ValueError(
            "Unsupported resume type for AI parsing. "
            "Upload PDF or DOCX instead."
        )

    if name.endswith((".txt", ".md", ".csv")):
        return content.decode("utf-8", errors="replace")

    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(content))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return "\n".join(parts)
        except ImportError:
            raise ValueError("PDF support requires pypdf. Install with: pip install pypdf")
        except Exception as e:
            raise ValueError(f"Could not read PDF: {e}") from e

    if name.endswith(".docx"):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                with zf.open("word/document.xml") as xml_file:
                    root = ET.parse(xml_file).getroot()
            paragraphs = []
            for p in root.iter(f"{{{W_NS}}}p"):
                line = "".join(t.text or "" for t in p.iter(f"{{{W_NS}}}t"))
                if line.strip():
                    paragraphs.append(line.strip())
            return "\n".join(paragraphs)
        except Exception as e:
            raise ValueError(f"Could not read DOCX: {e}") from e

    raise ValueError("Unsupported resume type for AI parsing")


class ResumeAIService:
    """AI resume parsing + screening using the active provider from AI settings."""

    @staticmethod
    async def _settings() -> Tuple[Dict[str, Any], Dict[str, Any]]:
        ai_settings = await AIService._get_ai_settings()
        provider = get_active_provider(ai_settings.get("providers") or [])
        if not provider:
            raise HTTPException(
                status_code=400,
                detail="No AI provider configured. Add one under Settings → AI.",
            )
        return ai_settings, provider

    @staticmethod
    async def _recruitment_settings() -> dict:
        from app.modules.settings.service import SettingsService

        db = await get_db()
        try:
            return await SettingsService(db).get_settings("RECRUITMENT")
        except Exception as e:
            logger.warning("Could not load recruitment settings: %s", e)
            return {}

    @staticmethod
    async def _flag(key: str) -> bool:
        s = await ResumeAIService._recruitment_settings()
        return str(s.get(key, "false")).lower() == "true"

    @staticmethod
    async def _call_json(system: str, user: str) -> Tuple[dict, Dict[str, Any]]:
        ai_settings, provider = await ResumeAIService._settings()
        provider_type = provider.get("provider", "")
        config = provider.get("config") or {}
        try:
            configured = int(ai_settings.get("max_tokens") or 0)
        except (TypeError, ValueError):
            configured = 0
        # Reasoning models (e.g. openai/gpt-oss-120b) spend part of the budget on
        # hidden reasoning tokens, so a bare minimum is required for useful JSON.
        max_tokens = min(max(configured, 1500), 4096)
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        try:
            raw = await complete_chat(
                provider_type=provider_type,
                config=config,
                messages=messages,
                temperature=0.2,
                max_tokens=max_tokens,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=502, detail=format_ai_error(e)) from e
        return extract_json_object(raw), provider

    # ── text extraction ───────────────────────────────────────────

    @staticmethod
    async def _download_resume(resume_url: str) -> bytes:
        url = await storage.signed_url(resume_url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Could not load resume from storage")
        return resp.content

    @staticmethod
    async def _load_resume_text(resume_url: str, filename: str) -> str:
        content = await ResumeAIService._download_resume(resume_url)
        text = extract_text_from_resume(content, filename or "resume.pdf")
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the resume")
        return text[:RAW_TEXT_CHAR_LIMIT]

    # ── profile mapping ───────────────────────────────────────────

    @staticmethod
    async def _apply_profile(db, candidate, profile: dict):
        """Fill candidate blanks from the parsed profile. Never overwrites existing data."""
        profile = profile if isinstance(profile, dict) else {}
        payload: dict = {}
        mappings = {
            "full_name": "fullName",
            "email": "email",
            "phone": "phone",
            "location": "location",
            "current_position": "currentPosition",
            "current_company": "currentCompany",
            "experience": "experience",
            "notice_period": "noticePeriod",
            "linkedin_url": "linkedinUrl",
            "summary": "description",
        }
        for src, dest in mappings.items():
            val = profile.get(src)
            if val is None or not str(val).strip():
                continue
            if getattr(candidate, dest, None):
                continue
            payload[dest] = str(val).strip()

        skills = profile.get("skills")
        if isinstance(skills, list) and skills:
            merged: List[str] = []
            existing = getattr(candidate, "skills", None)
            if isinstance(existing, list):
                merged = [str(s) for s in existing]
            for s in skills:
                cleaned = str(s).strip()
                if cleaned and cleaned not in merged:
                    merged.append(cleaned)
            if merged:
                payload["skills"] = Json(merged)

        if payload:
            candidate = await db.candidate.update(where={"id": candidate.id}, data=payload)
        return candidate

    # ── parse (profile only, no job context) ───────────────────────

    @staticmethod
    async def parse_candidate(candidate_id: str) -> dict:
        db = await get_db()
        candidate = await db.candidate.find_first(where={"id": candidate_id})
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if not candidate.resumeUrl:
            raise HTTPException(status_code=400, detail="Candidate has no resume to parse")

        text = await ResumeAIService._load_resume_text(
            candidate.resumeUrl, candidate.resumeFileName or ""
        )
        profile, provider = await ResumeAIService._call_json(
            PARSE_SYSTEM_PROMPT, f"Candidate resume:\n\n{text}"
        )
        candidate = await ResumeAIService._apply_profile(db, candidate, profile)

        provider_name = provider.get("name") or provider.get("provider", "")
        model = (provider.get("config") or {}).get("model")
        await db.recruitmentlog.create(
            data={
                "actorId": None,
                "action": "Resume parsed with AI",
                "entityType": "candidate",
                "entityId": candidate.id,
                "candidateId": candidate.id,
                "meta": Json(
                    {
                        "ai_parse": {
                            "profile": profile,
                            "provider": provider.get("provider"),
                            "model": model,
                        }
                    }
                ),
            }
        )
        await create_event_activity(
            db,
            title=f"Resume parsed with AI ({provider_name})",
            candidate_id=candidate.id,
        )

        from app.modules.candidates.service import CandidateService

        return {
            "candidate": await CandidateService.get_candidate(candidate.id),
            "parsed": {
                "profile": profile,
                "provider": provider.get("provider"),
                "provider_name": provider_name,
                "model": model,
                "parsed_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    # ── screen (profile + job-fit score in one call) ────────────────

    @staticmethod
    async def screen_application(application_id: str) -> dict:
        db = await get_db()
        match = await db.match.find_first(
            where={"id": application_id},
            include={"candidate": True, "job": {"include": {"organization": True}}},
        )
        if not match:
            raise HTTPException(status_code=404, detail="Application not found")

        resume_url = match.resumeUrl
        resume_name = match.resumeFileName or ""
        if not resume_url and match.candidate:
            resume_url = match.candidate.resumeUrl
            resume_name = match.candidate.resumeFileName or ""
        if not resume_url:
            raise HTTPException(status_code=400, detail="Application has no resume to screen")

        text = await ResumeAIService._load_resume_text(resume_url, resume_name)
        job = match.job
        job_context = {
            "title": job.title if job else None,
            "description": job.description if job else None,
            "location": job.location if job else None,
            "is_remote": job.isRemote if job else None,
            "contract_type": job.contractType if job else None,
            "experience": job.experience if job else None,
            "salary_currency": job.salaryCurrency if job else None,
            "salary_min": float(job.salaryMin) if job and job.salaryMin is not None else None,
            "salary_max": float(job.salaryMax) if job and job.salaryMax is not None else None,
            "salary_frequency": job.salaryFrequency if job else None,
            "tags": (job.tags if isinstance(job.tags, list) else None) if job else None,
            "organization_name": job.organization.name if job and job.organization else None,
        }
        user_payload = {
            "job": job_context,
            "candidate_reference": match.candidate.reference if match.candidate else None,
            "resume_text": text,
        }
        data, provider = await ResumeAIService._call_json(
            SCREEN_SYSTEM_PROMPT, json.dumps(user_payload)
        )

        profile = data.get("profile") if isinstance(data.get("profile"), dict) else {}
        match_data = data.get("match") if isinstance(data.get("match"), dict) else {}

        score: Optional[int] = None
        try:
            score = max(0, min(100, int(round(float(match_data.get("score"))))))
        except (TypeError, ValueError):
            score = None
        recommendation = (
            str(match_data.get("recommendation")).strip()
            if match_data.get("recommendation")
            else (recommendation_for(score) if score is not None else None)
        )
        strengths = (
            [str(s) for s in match_data["strengths"]]
            if isinstance(match_data.get("strengths"), list)
            else []
        )
        concerns = (
            [str(s) for s in match_data["concerns"]]
            if isinstance(match_data.get("concerns"), list)
            else []
        )
        screening = {
            "score": score,
            "recommendation": recommendation,
            "summary": match_data.get("summary"),
            "strengths": strengths,
            "concerns": concerns,
            "provider": provider.get("provider"),
            "model": (provider.get("config") or {}).get("model"),
            "screened_at": datetime.now(timezone.utc).isoformat(),
        }

        answers = dict(match.answers) if isinstance(match.answers, dict) else {}
        answers["__ai"] = {"parsed": profile, "screening": screening}
        update_data: dict = {"answers": Json(answers)}
        if score is not None:
            update_data["matchScore"] = Decimal(str(score))
        await db.match.update(where={"id": match.id}, data=update_data)

        if match.candidate:
            try:
                await ResumeAIService._apply_profile(db, match.candidate, profile)
            except Exception as e:
                logger.warning(
                    "Could not apply parsed profile to candidate %s: %s",
                    match.candidate.id,
                    e,
                )

        provider_name = provider.get("name") or provider.get("provider", "")
        await db.recruitmentlog.create(
            data={
                "actorId": None,
                "action": "AI screening completed",
                "entityType": "candidate",
                "entityId": match.candidateId,
                "candidateId": match.candidateId,
                "jobId": match.jobId,
                "meta": Json(
                    {
                        "ai_screening": {
                            "score": score,
                            "recommendation": recommendation,
                            "provider": provider.get("provider"),
                            "model": (provider.get("config") or {}).get("model"),
                        },
                        "job_title": job.title if job else None,
                    }
                ),
            }
        )
        await create_event_activity(
            db,
            title=(
                f"AI screening: {recommendation or 'No score'} "
                f"({score}%) via {provider_name}"
            ),
            candidate_id=match.candidateId,
            job_id=match.jobId,
        )

        from app.modules.applications.service import ApplicationService

        return {
            "application": await ApplicationService.get(match.id),
            "screening": screening,
        }

    # ── non-fatal auto hooks ────────────────────────────────────────

    @staticmethod
    async def try_parse_candidate(candidate_id: str) -> None:
        try:
            if not await ResumeAIService._flag("ai_parse_resumes"):
                return
            db = await get_db()
            already = await db.recruitmentlog.count(
                where={
                    "action": "Resume parsed with AI",
                    "candidateId": candidate_id,
                }
            )
            if already:
                return
            await ResumeAIService.parse_candidate(candidate_id)
        except Exception as e:
            logger.warning("[AI] Skipped resume parse for candidate %s: %s", candidate_id, e)

    @staticmethod
    async def try_screen_application(application_id: str) -> None:
        try:
            if not await ResumeAIService._flag("ai_screen_applications"):
                return
            db = await get_db()
            match = await db.match.find_first(where={"id": application_id})
            if not match or has_screening(match):
                return
            await ResumeAIService.screen_application(application_id)
        except Exception as e:
            logger.warning("[AI] Skipped screening for application %s: %s", application_id, e)