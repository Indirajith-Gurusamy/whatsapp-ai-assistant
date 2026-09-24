"""CSV export helpers."""
import csv
import io
from typing import Iterable, Optional, Sequence, Union

from fastapi import Response

Cell = Union[str, int, float, bool, None]
_FORBIDDEN_PREFIXES = ("=", "+", "-", "@")


def safe_cell(value: Optional[Cell]) -> str:
    """Render a cell as text, neutralizing spreadsheet formula injection."""
    if value is None:
        return ""
    text = str(value)
    if text.startswith(_FORBIDDEN_PREFIXES):
        return "'" + text
    return text


def csv_download(
    headers: Sequence[str],
    rows: Iterable[Sequence[Cell]],
    filename: str,
) -> Response:
    """Build a CSV download response readable by Excel (UTF-8 BOM)."""
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\r\n")
    writer.writerow(headers)
    for row in rows:
        writer.writerow([safe_cell(cell) for cell in row])
    content = "\ufeff" + buf.getvalue()
    safe_name = filename.replace('"', "").replace("\r", "").replace("\n", "")
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )