"""Public careers API (no authentication)."""
import json

from fastapi import APIRouter, HTTPException, Request
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.modules.careers.service import CareersService

router = APIRouter(prefix="/careers", tags=["Careers (public)"])


@router.get("/settings")
async def get_settings():
    return await CareersService.settings()


@router.get("/jobs")
async def list_jobs():
    result = await CareersService.list_jobs()
    return result


@router.get("/jobs/{slug}")
async def get_job(slug: str):
    return await CareersService.job_by_slug(slug)


@router.post("/jobs/{slug}/apply")
async def apply_to_job(slug: str, request: Request):
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        form = await request.json()
        if not isinstance(form, dict):
            raise HTTPException(status_code=400, detail="Invalid request body")
        form = {str(k): (v if isinstance(v, (str, int, float)) else str(v)) for k, v in form.items()}
        resume_file = None
    else:
        form_data = await request.form()
        form = {}
        resume_file = None
        for key, value in form_data.items():
            if isinstance(value, StarletteUploadFile) and value.filename:
                if key != "resume":
                    continue
                content = await value.read()
                resume_file = (value.filename, value.content_type or "", content)
            else:
                form[key] = str(value)
    result = await CareersService.apply(slug, form, resume_file)
    if resume_file:
        await CareersService.run_ai_after_apply(
            result.get("candidate_id"),
            result.get("job_id"),
        )
    return result