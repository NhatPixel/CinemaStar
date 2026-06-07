from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter

from ...config.settings import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/monitor")
def monitor():
    return {
        "status": "ok",
        "service": "chatbot-agent",
        "version": "0.1.0",
        "timestamp": datetime.now(UTC).isoformat(),
        "cinema_api_base_url": settings.CINEMA_API_BASE_URL,
        "cinema_api_configured": bool(settings.CINEMA_API_BASE_URL),
        "openai_configured": bool(
            settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT
        ),
    }
