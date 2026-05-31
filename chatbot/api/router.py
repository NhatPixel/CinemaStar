from __future__ import annotations

from fastapi import APIRouter

from .routes import chat, health, mocks

router = APIRouter()
router.include_router(health.router)
router.include_router(chat.router)
router.include_router(mocks.router)
