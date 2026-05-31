from __future__ import annotations

from typing import Any

from .catalog import API_CATALOG

_CAMPAIGN_LIST = [
    {"id": "camp_001", "name": "Summer Sale", "status": "active"},
    {"id": "camp_002", "name": "Back to School", "status": "paused"},
    {"id": "camp_003", "name": "Holiday Promo", "status": "draft"},
]

_CAMPAIGN_DETAILS: dict[str, dict[str, Any]] = {
    "camp_001": {
        "id": "camp_001",
        "name": "Summer Sale",
        "status": "active",
        "site_id": "site_vn_02",
        "metrics": {"impressions": 45000, "clicks": 2100, "ctr": 0.0467},
        "updated_at": "2026-05-28T14:30:00Z",
    },
    "camp_002": {
        "id": "camp_002",
        "name": "Back to School",
        "status": "paused",
        "site_id": "site_vn_01",
        "metrics": {"impressions": 12500, "clicks": 340, "ctr": 0.0272},
        "updated_at": "2026-05-20T10:00:00Z",
    },
    "camp_003": {
        "id": "camp_003",
        "name": "Holiday Promo",
        "status": "draft",
        "site_id": "site_vn_01",
        "metrics": {"impressions": 0, "clicks": 0, "ctr": 0.0},
        "updated_at": "2026-05-15T08:00:00Z",
    },
}


class MockApiError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def list_campaigns() -> dict[str, Any]:
    return {"campaigns": _CAMPAIGN_LIST, "total": len(_CAMPAIGN_LIST)}


def get_campaign(campaign_id: str) -> dict[str, Any]:
    detail = _CAMPAIGN_DETAILS.get(campaign_id)
    if not detail:
        raise MockApiError(f"Campaign not found: {campaign_id}", status_code=404)
    return detail


def path_params_for_api(api_id: str, campaign_id: str | None) -> dict[str, str]:
    if api_id == "get_campaign":
        cid = (campaign_id or "").strip()
        if cid:
            return {"campaign_id": cid}
    return {}


def build_request_summary(
    api_id: str,
    path_params: dict[str, str],
    query_params: dict[str, str],
) -> str:
    api = API_CATALOG.get(api_id)
    path = api.path if api else api_id
    if path_params:
        for key, value in path_params.items():
            path = path.replace(f"{{{key}}}", value)
    qs = "&".join(f"{k}={v}" for k, v in query_params.items())
    if qs:
        path = f"{path}?{qs}"
    method = api.method if api else "GET"
    return f"{method} {path}"


def execute(
    api_id: str,
    path_params: dict[str, str] | None = None,
    query_params: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Run mock API handler in-process."""
    _ = query_params
    path_params = path_params or {}

    if api_id not in API_CATALOG:
        raise MockApiError(f"Unknown api_id: {api_id}", status_code=400)

    if api_id == "list_campaigns":
        return list_campaigns()
    if api_id == "get_campaign":
        campaign_id = path_params.get("campaign_id", "").strip()
        if not campaign_id:
            raise MockApiError("path_params.campaign_id is required", status_code=400)
        return get_campaign(campaign_id)

    raise MockApiError(f"Handler not implemented for api_id: {api_id}", status_code=500)
