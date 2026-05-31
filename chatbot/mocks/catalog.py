from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ApiDefinition:
    api_id: str
    method: str
    path: str
    description: str
    sample_request: dict[str, Any]
    sample_response: dict[str, Any]


API_CATALOG: dict[str, ApiDefinition] = {
    "list_campaigns": ApiDefinition(
        api_id="list_campaigns",
        method="GET",
        path="/mock/campaigns",
        description="List all marketing campaigns with id, name, and status.",
        sample_request={"query_params": {}},
        sample_response={
            "campaigns": [
                {"id": "camp_001", "name": "Summer Sale", "status": "active"},
                {"id": "camp_002", "name": "Back to School", "status": "paused"},
                {"id": "camp_003", "name": "Holiday Promo", "status": "draft"},
            ],
            "total": 3,
        },
    ),
    "get_campaign": ApiDefinition(
        api_id="get_campaign",
        method="GET",
        path="/mock/campaigns/{campaign_id}",
        description="Get detailed metrics and site for a single campaign by id.",
        sample_request={"path_params": {"campaign_id": "camp_002"}},
        sample_response={
            "id": "camp_002",
            "name": "Back to School",
            "status": "paused",
            "site_id": "site_vn_01",
            "metrics": {"impressions": 12500, "clicks": 340, "ctr": 0.0272},
            "updated_at": "2026-05-20T10:00:00Z",
        },
    ),
}


def format_catalog_for_prompt() -> str:
    """Serialize API catalog for LLM system prompt."""
    lines: list[str] = []
    for api in API_CATALOG.values():
        lines.append(
            f"- api_id: {api.api_id}\n"
            f"  method: {api.method}\n"
            f"  path: {api.path}\n"
            f"  description: {api.description}\n"
            f"  sample_request: {api.sample_request}\n"
            f"  sample_response: {api.sample_response}"
        )
    return "\n\n".join(lines)
