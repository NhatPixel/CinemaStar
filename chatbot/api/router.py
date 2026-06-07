from __future__ import annotations

from fastapi import APIRouter

from .routes import chat, health

router = APIRouter()
router.include_router(health.router)
router.include_router(chat.router)
