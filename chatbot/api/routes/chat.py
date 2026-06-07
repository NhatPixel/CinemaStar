from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from loguru import logger

from ..schemas import ChatRequest, ChatResponse
from ...services.auth_context import BackendApiResponseError, resolve_auth_cookie
from ...services.chat import run_chat

router = APIRouter(tags=["chat"])


def _backend_json_response(exc: BackendApiResponseError) -> JSONResponse:
    content = exc.payload if isinstance(exc.payload, dict) else {"message": str(exc.payload)}
    return JSONResponse(status_code=exc.status_code, content=content)


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        400: {"description": "Lỗi từ CinemaStar API (body giống backend)"},
        401: {"description": "Lỗi xác thực từ CinemaStar API (body giống backend)"},
        403: {"description": "Lỗi phân quyền từ CinemaStar API (body giống backend)"},
    },
)
def chat_endpoint(body: ChatRequest, request: Request):
    auth_cookie = resolve_auth_cookie(
        header_cookie=request.headers.get("cookie") or request.headers.get("Cookie"),
        body_cookie=body.auth_cookie,
        access_token=body.access_token,
        refresh_token=body.refresh_token,
        parsed_cookies=dict(request.cookies),
    )
    if auth_cookie:
        logger.info("Chat auth cookie received (len={})", len(auth_cookie))
    else:
        logger.info("Chat without auth cookie — role will be CUSTOMER")
    try:
        return run_chat(body.question, auth_cookie=auth_cookie, history=body.history)
    except BackendApiResponseError as exc:
        return _backend_json_response(exc)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
