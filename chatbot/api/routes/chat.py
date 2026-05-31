from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from ..schemas import ChatRequest, ChatResponse
from ...services.chat import run_chat

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat_endpoint(body: ChatRequest):
    try:
        return run_chat(body.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
