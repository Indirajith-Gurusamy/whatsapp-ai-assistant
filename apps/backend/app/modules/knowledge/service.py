"""Knowledge base storage and retrieval for RAG."""
import logging
import re
from typing import List, Optional

from app.db.client import get_db
from app.modules.knowledge.chunking import chunk_text, extract_text_from_bytes

logger = logging.getLogger(__name__)

RAG_TOP_K = 4


def _score_chunk(query: str, chunk: str) -> float:
    q_words = set(re.findall(r"[a-z0-9]+", query.lower()))
    if not q_words:
        return 0.0
    c_words = set(re.findall(r"[a-z0-9]+", chunk.lower()))
    if not c_words:
        return 0.0
    overlap = len(q_words & c_words)
    return overlap / len(q_words)


class KnowledgeService:
    @staticmethod
    def _serialize_doc(row, chunk_count: int = 0) -> dict:
        return {
            "uuid": row.uuid,
            "title": row.title,
            "filename": row.filename,
            "mime_type": row.mimeType,
            "is_active": row.isActive,
            "chunk_count": chunk_count,
            "created_at": row.createdAt.isoformat() if row.createdAt else None,
        }

    @staticmethod
    async def list_documents() -> List[dict]:
        db = await get_db()
        docs = await db.knowledgedocument.find_many(order={"createdAt": "desc"})
        result = []
        for doc in docs:
            count = await db.knowledgechunk.count(where={"documentId": doc.id})
            result.append(KnowledgeService._serialize_doc(doc, count))
        return result

    @staticmethod
    async def ingest_text(title: str, text: str, filename: Optional[str] = None) -> dict:
        db = await get_db()
        doc = await db.knowledgedocument.create(
            data={
                "title": title,
                "filename": filename,
                "mimeType": "text/plain",
                "isActive": True,
            }
        )
        chunks = chunk_text(text)
        for i, content in enumerate(chunks):
            await db.knowledgechunk.create(
                data={"documentId": doc.id, "chunkIndex": i, "content": content}
            )
        return KnowledgeService._serialize_doc(doc, len(chunks))

    @staticmethod
    async def ingest_file(title: str, content: bytes, mime_type: str, filename: str) -> dict:
        text = extract_text_from_bytes(content, mime_type, filename)
        if not text.strip():
            raise ValueError("No text could be extracted from file")
        return await KnowledgeService.ingest_text(title, text, filename)

    @staticmethod
    async def delete_document(uuid: str) -> bool:
        db = await get_db()
        doc = await db.knowledgedocument.find_unique(where={"uuid": uuid})
        if not doc:
            return False
        await db.knowledgedocument.delete(where={"uuid": uuid})
        return True

    @staticmethod
    async def set_active(uuid: str, is_active: bool) -> Optional[dict]:
        db = await get_db()
        doc = await db.knowledgedocument.find_unique(where={"uuid": uuid})
        if not doc:
            return None
        row = await db.knowledgedocument.update(
            where={"uuid": uuid}, data={"isActive": is_active}
        )
        count = await db.knowledgechunk.count(where={"documentId": row.id})
        return KnowledgeService._serialize_doc(row, count)

    @staticmethod
    async def retrieve_context(query: str, top_k: int = RAG_TOP_K) -> str:
        """Return formatted context block for system prompt injection."""
        db = await get_db()
        docs = await db.knowledgedocument.find_many(where={"isActive": True})
        if not docs:
            return ""

        doc_ids = [d.id for d in docs]
        chunks = await db.knowledgechunk.find_many(
            where={"documentId": {"in": doc_ids}},
        )
        if not chunks:
            return ""

        scored = sorted(
            [(c, _score_chunk(query, c.content)) for c in chunks],
            key=lambda x: x[1],
            reverse=True,
        )
        top = [c for c, s in scored if s > 0][:top_k]
        if not top and scored:
            top = [scored[0][0]]

        lines = ["## Knowledge base (use when relevant)\n"]
        for c in top:
            lines.append(f"- {c.content[:800]}")
        return "\n".join(lines)
