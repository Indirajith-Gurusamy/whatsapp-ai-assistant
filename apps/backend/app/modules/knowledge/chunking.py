"""Simple text chunking for knowledge base RAG."""
import re
from typing import List

CHUNK_SIZE = 600
CHUNK_OVERLAP = 80


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def extract_text_from_bytes(content: bytes, mime_type: str, filename: str) -> str:
    mime = (mime_type or "").lower()
    name = (filename or "").lower()

    if mime.startswith("text/") or name.endswith((".txt", ".md", ".csv")):
        return content.decode("utf-8", errors="replace")

    if name.endswith(".pdf") or mime == "application/pdf":
        try:
            from pypdf import PdfReader
            import io

            reader = PdfReader(io.BytesIO(content))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            return "\n".join(parts)
        except ImportError:
            raise ValueError("PDF support requires pypdf. Install with: pip install pypdf")
        except Exception as e:
            raise ValueError(f"Could not read PDF: {e}") from e

    raise ValueError("Unsupported file type. Upload .txt, .md, or .pdf")
