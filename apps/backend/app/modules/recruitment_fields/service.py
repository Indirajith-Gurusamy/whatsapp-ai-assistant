"""Configurable/custom field definitions service.

Field values storage:
  - Built-in fields map to real columns (or `Match.answers`/settings).
  - Custom fields store values inside each entity's `customFields` JSONB,
    keyed by an immutable short `code`.
Deletion is soft (isActive = False + deletedAt) — data is never purged.
"""
import asyncio
import json
import logging
import random
from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from app.db.client import get_db
from app.db.prisma import Json
from app.modules.recruitment_fields.schemas import ENTITIES, FIELD_TYPES

logger = logging.getLogger(__name__)

CODE_LENGTH = 5
# a-z 0-9 without lookalikes (0/O, 1/l/I) to stay readable.
SAFE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"

BUILTIN_DEFS = {
    "CLIENT": [
        {"key": "name", "label": "Name", "field_type": "text", "required": True},
        {"key": "logo_url", "label": "Logo URL", "field_type": "url"},
        {"key": "location", "label": "Location", "field_type": "text"},
        {"key": "description", "label": "Description", "field_type": "textarea"},
    ],
    "JOB": [
        {"key": "title", "label": "Title", "field_type": "text", "required": True},
        {"key": "description", "label": "Description", "field_type": "textarea"},
        {"key": "location", "label": "Location", "field_type": "text"},
        {"key": "is_remote", "label": "Remote", "field_type": "boolean"},
        {
            "key": "contract_type",
            "label": "Contract type",
            "field_type": "select",
            "options": ["Full-time", "Part-time", "Contract", "Freelance", "Internship"],
        },
        {"key": "experience", "label": "Experience", "field_type": "text"},
        {
            "key": "salary_currency",
            "label": "Salary currency",
            "field_type": "select",
            "options": ["USD", "EUR", "GBP", "INR", "AED", "CAD", "AUD"],
        },
        {"key": "salary_min", "label": "Salary minimum", "field_type": "number"},
        {"key": "salary_max", "label": "Salary maximum", "field_type": "number"},
        {
            "key": "salary_frequency",
            "label": "Salary frequency",
            "field_type": "select",
            "options": ["per month", "per year", "per hour", "per day"],
        },
        {"key": "salary_negotiable", "label": "Salary negotiable", "field_type": "boolean"},
        {"key": "headcount", "label": "Headcount", "field_type": "number"},
        {"key": "tags", "label": "Tags", "field_type": "text"},
        {
            "key": "status",
            "label": "Status",
            "field_type": "select",
            "options": ["DRAFT", "ACTIVE", "ARCHIVED"],
        },
    ],
    "CANDIDATE": [
        {"key": "full_name", "label": "Full name", "field_type": "text", "required": True},
        {"key": "email", "label": "Email", "field_type": "email"},
        {"key": "phone", "label": "Phone", "field_type": "text"},
        {"key": "gender", "label": "Gender", "field_type": "text"},
        {"key": "birth_date", "label": "Birth date", "field_type": "text"},
        {"key": "location", "label": "Current location", "field_type": "text"},
        {"key": "current_company", "label": "Current company", "field_type": "text"},
        {"key": "current_position", "label": "Current position", "field_type": "text"},
        {"key": "experience", "label": "Experience", "field_type": "text"},
        {"key": "notice_period", "label": "Notice period", "field_type": "text"},
        {"key": "last_working_day", "label": "Last working day", "field_type": "text"},
        {"key": "expected_salary", "label": "Expected salary", "field_type": "text"},
        {"key": "current_salary", "label": "Current salary", "field_type": "text"},
        {"key": "linkedin_url", "label": "LinkedIn profile", "field_type": "url"},
        {
            "key": "source",
            "label": "Source",
            "field_type": "select",
            "options": ["Careers Page", "Referral", "LinkedIn", "Job Board", "Walk-in", "Other"],
        },
        {"key": "description", "label": "Description", "field_type": "textarea"},
        {"key": "skills", "label": "Skills", "field_type": "text"},
    ],
    "APPLICATION": [
        {"key": "source", "label": "Source", "field_type": "text"},
        {"key": "match_score", "label": "Match score", "field_type": "number"},
    ],
}


def _coerce_value(field_type: str, raw) -> object:
    """Coerce a submitted raw value to the field type's stored representation."""
    if raw is None:
        return None
    if field_type == "boolean":
        return isinstance(raw, bool) and raw or str(raw).lower() in ("true", "on", "yes", "1")
    if field_type == "number":
        try:
            f = float(raw)
            return int(f) if f.is_integer() else f
        except (TypeError, ValueError):
            return str(raw)
    if field_type == "multi_select":
        if isinstance(raw, list):
            return [str(x) for x in raw]
        text = str(raw)
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return [str(x) for x in parsed]
            except (TypeError, ValueError):
                pass
        return [x.strip() for x in text.split(",") if x.strip()]
    return str(raw)


class RecruitmentFieldsService:
    @staticmethod
    async def seed_builtin_fields(db) -> None:
        """Idempotent: create built-in definitions that don't exist yet.

        Never re-activates fields that were deliberately deleted (soft).
        """
        created = 0
        for entity, defs in BUILTIN_DEFS.items():
            for i, spec in enumerate(defs):
                exists = await db.recruitmentfield.find_first(
                    where={"entity": entity, "key": spec["key"]}
                )
                if exists:
                    continue
                await db.recruitmentfield.create(
                    data={
                        "entity": entity,
                        "code": spec["key"],
                        "key": spec["key"],
                        "label": spec["label"],
                        "fieldType": spec["field_type"],
                        "options": Json(spec.get("options") or []),
                        "required": bool(spec.get("required")),
                        "showInForm": True,
                        "sortOrder": i,
                        "isBuiltIn": True,
                        "isActive": True,
                    }
                )
                created += 1
        if created:
            logger.info("Seeded %s built-in recruitment field definitions", created)

    @staticmethod
    async def _next_code(db, entity: str) -> str:
        for _ in range(50):
            code = "".join(random.choices(SAFE_ALPHABET, k=CODE_LENGTH))
            exists = await db.recruitmentfield.find_first(
                where={"entity": entity, "code": code}
            )
            if not exists:
                return code
        raise HTTPException(status_code=500, detail="Could not generate a unique field code")

    @staticmethod
    async def sanitize_custom_fields(db, entity: str, values: Optional[dict]) -> Optional[dict]:
        """Filter custom field values to defined, active fields; coerce types."""
        if not values:
            return None
        defs = await db.recruitmentfield.find_many(
            where={"entity": entity, "isActive": True, "key": {"equals": None}}
        )
        active = {d.code: d for d in defs}
        out: dict = {}
        is_json = False
        for k, v in values.items():
            d = active.get(str(k))
            if not d:
                continue
            coerced = _coerce_value(d.fieldType, v)
            if coerced is None:
                continue
            out[k] = coerced
            is_json = True
        return out if is_json else None

    @staticmethod
    async def list_fields(entity: Optional[str] = None, include_deleted: bool = False) -> dict:
        db = await get_db()
        where: dict = {}
        if entity:
            entity = str(entity).upper()
            if entity not in ENTITIES:
                raise HTTPException(status_code=400, detail=f"Invalid entity '{entity}'. Must be one of: {', '.join(sorted(ENTITIES))}")
            where["entity"] = entity
        if not include_deleted:
            where["isActive"] = True
        rows = await db.recruitmentfield.find_many(
            where=where or None,
            order=[{"sortOrder": "asc"}, {"id": "asc"}],
        )
        fields = [_field_out(f) for f in rows]
        return {"fields": fields, "total": len(fields)}

    @staticmethod
    async def create_field(data: dict) -> dict:
        db = await get_db()
        entity = str(data["entity"]).upper()
        if entity not in ENTITIES:
            raise HTTPException(status_code=400, detail=f"Invalid entity '{entity}'")
        field_type = str(data["field_type"]).lower()
        if field_type not in FIELD_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid field_type '{field_type}'")
        if field_type in ("select", "multi_select") and not data.get("options"):
            raise HTTPException(status_code=400, detail="Select fields require options")
        code = await RecruitmentFieldsService._next_code(db, entity)
        order = data.get("sort_order", 0)
        row = await db.recruitmentfield.create(
            data={
                "entity": entity,
                "code": code,
                "key": None,
                "label": str(data["label"]).strip(),
                "fieldType": field_type,
                "options": Json(data.get("options") or []),
                "required": bool(data.get("required", False)),
                "showInForm": bool(data.get("show_in_form", True)),
                "showInApply": bool(data.get("show_in_apply", False)),
                "showInList": bool(data.get("show_in_list", False)),
                "sortOrder": int(order),
                "isBuiltIn": False,
                "isActive": True,
            }
        )
        return _field_out(row)

    @staticmethod
    async def update_field(field_id: str, data: dict) -> dict:
        db = await get_db()
        pk = _parse_field_id(field_id)
        row = await db.recruitmentfield.find_first(where={"id": pk})
        if not row:
            raise HTTPException(status_code=404, detail="Field definition not found")
        payload: dict = {}
        if data.get("label") is not None:
            payload["label"] = str(data["label"]).strip()
        if data.get("field_type") is not None:
            field_type = str(data["field_type"]).lower()
            if field_type not in FIELD_TYPES:
                raise HTTPException(status_code=400, detail=f"Invalid field_type '{field_type}'")
            if field_type in ("select", "multi_select") and not data.get("options"):
                raise HTTPException(status_code=400, detail="Select fields require options")
            payload["fieldType"] = field_type
        if data.get("options") is not None:
            payload["options"] = Json(data["options"])
        for src, dest in (
            ("required", "required"),
            ("show_in_form", "showInForm"),
            ("show_in_apply", "showInApply"),
            ("show_in_list", "showInList"),
            ("sort_order", "sortOrder"),
        ):
            if data.get(src) is not None:
                payload[dest] = data[src]
        updated = await db.recruitmentfield.update(where={"id": pk}, data=payload)
        return _field_out(updated)

    @staticmethod
    async def soft_delete_field(field_id: str) -> dict:
        db = await get_db()
        pk = _parse_field_id(field_id)
        row = await db.recruitmentfield.find_first(where={"id": pk})
        if not row:
            raise HTTPException(status_code=404, detail="Field definition not found")
        if not row.isActive:
            raise HTTPException(status_code=409, detail="Field is already deleted")
        await db.recruitmentfield.update(
            where={"id": pk},
            data={"isActive": False, "deletedAt": datetime.utcnow()},
        )
        return {"deleted": True, "field_id": str(pk), "code": row.code, "label": row.label}

    @staticmethod
    async def restore_field(field_id: str) -> dict:
        db = await get_db()
        pk = _parse_field_id(field_id)
        row = await db.recruitmentfield.find_first(where={"id": pk})
        if not row:
            raise HTTPException(status_code=404, detail="Field definition not found")
        if row.isActive:
            raise HTTPException(status_code=409, detail="Field is not deleted")
        updated = await db.recruitmentfield.update(
            where={"id": pk},
            data={"isActive": True, "deletedAt": None},
        )
        return _field_out(updated)

    @staticmethod
    async def reorder(entity: str, codes: list) -> dict:
        db = await get_db()
        entity = str(entity).upper()
        if entity not in ENTITIES:
            raise HTTPException(status_code=400, detail=f"Invalid entity '{entity}'")
        rows = await db.recruitmentfield.find_many(where={"entity": entity})
        by_code = {r.code: r for r in rows}
        valid = [c for c in codes if c in by_code]
        for i, code in enumerate(valid):
            row = by_code[code]
            if row.sortOrder != i:
                await db.recruitmentfield.update(
                    where={"id": row.id}, data={"sortOrder": i}
                )
        return {"entity": entity, "reordered": len(valid)}

    @staticmethod
    async def active_apply_fields(entities: list) -> list:
        """Active field definitions (built-in + custom) shown on the public apply form."""
        db = await get_db()
        rows = await db.recruitmentfield.find_many(
            where={
                "entity": {"in": [str(e).upper() for e in entities]},
                "isActive": True,
                "showInApply": True,
            },
            order=[{"sortOrder": "asc"}, {"id": "asc"}],
        )
        return [_field_out(f) for f in rows]


def _parse_field_id(field_id: str) -> int:
    try:
        return int(str(field_id).strip())
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid field id")


def _field_out(row) -> dict:
    return {
        "id": str(row.id),
        "entity": row.entity,
        "code": row.code,
        "key": row.key,
        "label": row.label,
        "field_type": row.fieldType,
        "options": row.options or [],
        "required": row.required,
        "show_in_form": row.showInForm,
        "show_in_apply": row.showInApply,
        "show_in_list": row.showInList,
        "sort_order": row.sortOrder,
        "is_built_in": row.isBuiltIn,
        "is_active": row.isActive,
        "deleted_at": row.deletedAt,
        "created_at": row.createdAt,
        "updated_at": row.updatedAt,
    }