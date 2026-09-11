"""Supabase Storage client for resume and attachment files.

Uses the Storage REST API with the service-role key (server-side only).
"""
import logging
import os
import time
from typing import Dict, Optional, Tuple

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

ALLOWED_MIME = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
ALLOWED_EXT = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 1 * 1024 * 1024  # 1 MB


class SupabaseStorage:
    def __init__(self) -> None:
        self.base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        self.bucket = os.environ.get("SUPABASE_RESUME_BUCKET", "resume")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }

    def _object_url(self, path: str) -> str:
        return f"{self.base_url}/storage/v1/object/{self.bucket}/{path}"

    def _sign_url(self) -> str:
        return f"{self.base_url}/storage/v1/object/sign/{self.bucket}"

    async def upload(self, path: str, content: bytes, content_type: str) -> str:
        """Upload bytes to the bucket. Returns the object key (no bucket prefix)."""
        if not self.base_url or not self.service_key:
            raise HTTPException(status_code=500, detail="Supabase storage is not configured")
        headers = {
            **self._headers(),
            "Content-Type": content_type,
            "x-upsert": "true",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._object_url(path), content=content, headers=headers
            )
        if resp.status_code not in (200, 201):
            logger.error("Supabase upload failed: %s %s", resp.status_code, resp.text[:300])
            raise HTTPException(status_code=502, detail="Failed to upload file to storage")
        logger.info("Uploaded object: %s (%s bytes)", path, len(content))
        return path

    async def signed_url(self, path: str, expires: int = 3600) -> str:
        """Return a signed URL for temporary public access to an object (cached).

        The signed URL is cached until shortly before it would expire, so repeat
        requests skip the network call to Supabase.
        """
        now = time.time()
        cached = _signed_cache.get(path)
        if cached and cached[1] > now:
            return cached[0]
        if not self.base_url or not self.service_key:
            raise HTTPException(status_code=500, detail="Supabase storage is not configured")
        headers = {**self._headers(), "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._sign_url() + f"/{path}",
                json={"expiresIn": expires},
                headers=headers,
            )
        if resp.status_code != 200:
            logger.error("Supabase sign failed: %s %s", resp.status_code, resp.text[:300])
            raise HTTPException(status_code=502, detail="Could not generate signed URL")
        data = resp.json()
        signed = data.get("signedURL")
        if not signed:
            raise HTTPException(status_code=502, detail="Could not generate signed URL")
        if signed.startswith("/storage/v1") or signed.startswith("http"):
            url = f"{self.base_url}{signed}"
        else:
            url = f"{self.base_url}/storage/v1{signed}"
        _signed_cache[path] = (url, now + max(expires - 120, 60))
        return url

    async def delete(self, path: str) -> None:
        """Delete an object from the bucket. No-op if path is empty."""
        if not path:
            return
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(self._object_url(path), headers=self._headers())
        if resp.status_code != 200:
            logger.warning("Supabase delete failed: %s %s", resp.status_code, resp.text[:200])


storage = SupabaseStorage()

# path -> (signed_url, expires_at_epoch)
_signed_cache: Dict[str, Tuple[str, float]] = {}


def validate_resume_file(filename: str, content_type: str, size: int) -> str:
    """Validate a resume upload. Returns the normalized extension."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Only PDF, DOC or DOCX files are allowed")
    if content_type not in ALLOWED_MIME and ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Only PDF, DOC or DOCX files are allowed")
    if size <= 0 or size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File must be 1 MB or smaller")
    return ext