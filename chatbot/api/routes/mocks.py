from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ...mocks.handlers import MockApiError, get_campaign, list_campaigns

router = APIRouter(prefix="/mock", tags=["mock-apis"])


@router.get("/campaigns")
def mock_list_campaigns():
    return list_campaigns()


@router.get("/campaigns/{campaign_id}")
def mock_get_campaign(campaign_id: str):
    try:
        return get_campaign(campaign_id)
    except MockApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
