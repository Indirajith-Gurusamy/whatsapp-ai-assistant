from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from app.core.db_errors import raise_if_table_missing
from app.modules.auth.dependencies import get_current_admin_user
from app.modules.knowledge.service import KnowledgeService

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


@router.get("")
async def list_documents(_admin=Depends(get_current_admin_user)):
    try:
        return await KnowledgeService.list_documents()
    except Exception as e:
        raise_if_table_missing(e)
        raise


@router.post("/upload")
async def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    _admin=Depends(get_current_admin_user),
):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    try:
        return await KnowledgeService.ingest_file(
            title=title.strip(),
            content=content,
            mime_type=file.content_type or "",
            filename=file.filename or "upload.txt",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/text")
async def ingest_text(
    body: dict,
    _admin=Depends(get_current_admin_user),
):
    title = (body.get("title") or "").strip()
    text = (body.get("text") or "").strip()
    if not title or not text:
        raise HTTPException(status_code=400, detail="title and text required")
    try:
        return await KnowledgeService.ingest_text(title, text)
    except Exception as e:
        raise_if_table_missing(e)
        raise


@router.patch("/{uuid}/active")
async def toggle_document(uuid: str, body: dict, _admin=Depends(get_current_admin_user)):
    is_active = body.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=400, detail="is_active required")
    result = await KnowledgeService.set_active(uuid, bool(is_active))
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.delete("/{uuid}")
async def delete_document(uuid: str, _admin=Depends(get_current_admin_user)):
    if not await KnowledgeService.delete_document(uuid):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True}
