"""Pipeline and response-time analytics from message/conversation data."""
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.db.client import get_db


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


async def compute_pipeline_analytics() -> Dict[str, Any]:
    db = await get_db()

    conversations = await db.conversation.find_many(
        include={"customer": True},
    )

    by_status: Dict[str, int] = defaultdict(int)
    status_ages_hours: Dict[str, List[float]] = defaultdict(list)
    agent_counts: Dict[str, int] = defaultdict(int)
    now = datetime.now(timezone.utc)

    for conv in conversations:
        status = (conv.leadStatus or "unknown").strip()
        by_status[status] += 1
        updated = _parse_ts(conv.updatedAt)
        age_h = max(0, (now - updated).total_seconds() / 3600)
        status_ages_hours[status].append(age_h)
        if conv.assignedTo:
            agent_counts[conv.assignedTo] += 1

    avg_time_in_stage = {
        status: round(sum(ages) / len(ages), 1) if ages else 0
        for status, ages in status_ages_hours.items()
    }

    messages = await db.message.find_many(order={"timestamp": "asc"}, take=5000)
    response_seconds: List[float] = []

    by_conv: Dict[int, List] = defaultdict(list)
    for m in messages:
        by_conv[m.conversationId].append(m)

    for conv_id, msgs in by_conv.items():
        for i, msg in enumerate(msgs):
            if msg.role != "user":
                continue
            for j in range(i + 1, len(msgs)):
                if msgs[j].role in ("assistant", "agent", "human_agent"):
                    t0 = _parse_ts(msg.timestamp)
                    t1 = _parse_ts(msgs[j].timestamp)
                    delta = (t1 - t0).total_seconds()
                    if 0 < delta < 86400 * 7:
                        response_seconds.append(delta)
                    break

    if response_seconds:
        response_seconds.sort()
        n = len(response_seconds)
        mid = n // 2
        if n % 2 == 1:
            median_sec = response_seconds[mid]
        else:
            median_sec = (response_seconds[mid - 1] + response_seconds[mid]) / 2
        p95_idx = int((n - 1) * 0.95)
        p95_sec = response_seconds[p95_idx]
        avg_sec = sum(response_seconds) / len(response_seconds)
    else:
        median_sec = p95_sec = avg_sec = 0

    def fmt_seconds(sec: float) -> str:
        if sec <= 0:
            return "—"
        if sec < 60:
            return f"{int(sec)}s"
        if sec < 3600:
            return f"{int(sec // 60)}m"
        return f"{round(sec / 3600, 1)}h"

    total_leads = sum(by_status.values())
    funnel = [
        {"stage": k, "count": v, "pct": round(v / total_leads * 100, 1) if total_leads else 0}
        for k, v in sorted(by_status.items(), key=lambda x: -x[1])
    ]

    return {
        "funnel": funnel,
        "by_status": dict(by_status),
        "avg_time_in_stage_hours": avg_time_in_stage,
        "agent_workload": [
            {"agent": email, "count": count}
            for email, count in sorted(agent_counts.items(), key=lambda x: -x[1])
        ],
        "response_time": {
            "median_seconds": round(median_sec, 1),
            "p95_seconds": round(p95_sec, 1),
            "average_seconds": round(avg_sec, 1),
            "median_display": fmt_seconds(median_sec),
            "p95_display": fmt_seconds(p95_sec),
            "average_display": fmt_seconds(avg_sec),
            "sample_size": len(response_seconds),
        },
    }
