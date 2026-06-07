from __future__ import annotations

from loguru import logger

from ..agents import AnswerAgent, CallApiAgent, SelectApiAgent
from ..api.schemas import (
    ApiCallPlan,
    ApiCallRecord,
    ChatHistoryMessage,
    ChatResponse,
    request_body_to_dict,
)
from ..apis import ApiExecutionError, build_request_summary, execute
from ..apis.catalog import normalize_user_role
from ..prompts.history import CHAT_HISTORY_LIMIT, normalize_chat_history
from .auth_context import BackendApiResponseError, resolve_user_role

_select_api_agent = SelectApiAgent()
_call_api_agent = CallApiAgent()
_answer_agent = AnswerAgent()


def _params_from_plan(
    plan: ApiCallPlan,
    path_params: dict[str, str] | None = None,
) -> tuple[dict[str, str], dict[str, str]]:
    resolved: dict[str, str] = {}
    if path_params:
        for key, value in path_params.items():
            text = str(value or "").strip()
            if text:
                resolved[key] = text
    return resolved, {}


def _raise_if_backend_error(exc: ApiExecutionError) -> None:
    if exc.backend_response is not None:
        raise BackendApiResponseError(exc.status_code, exc.backend_response) from exc


def _execute_plan(
    plan: ApiCallPlan,
    *,
    user_role: str,
    auth_cookie: str | None,
    path_params: dict[str, str] | None = None,
) -> ApiCallRecord:
    """Gọi CinemaStar API — luôn forward auth_cookie nếu khách đã đăng nhập."""
    api_id = plan.api_id.strip()
    path_params, query_params = _params_from_plan(plan, path_params)
    request_body = request_body_to_dict(plan.request_body)
    summary = build_request_summary(api_id, path_params, query_params, request_body)

    try:
        response = execute(
            api_id=api_id,
            user_role=user_role,
            auth_cookie=auth_cookie,
            path_params=path_params,
            query_params=query_params,
            request_body=request_body,
        )
    except ApiExecutionError as exc:
        logger.warning("Cinema API error [{}]: {}", api_id, exc)
        _raise_if_backend_error(exc)
        return ApiCallRecord(
            api_id=api_id,
            request_summary=summary,
            response={"error": str(exc), "status_code": exc.status_code},
        )

    return ApiCallRecord(
        api_id=api_id,
        request_summary=summary,
        response=response,
    )


def run_chat(
    question: str,
    *,
    auth_cookie: str | None = None,
    history: list[ChatHistoryMessage] | None = None,
) -> ChatResponse:
    q = (question or "").strip()
    if not q:
        raise ValueError("question must not be empty")

    chat_history = normalize_chat_history(history)
    role = normalize_user_role(resolve_user_role(auth_cookie))
    logger.info(
        "Chat session role={} cookie={} history={}/{}",
        role,
        "yes" if auth_cookie else "no",
        len(chat_history),
        CHAT_HISTORY_LIMIT,
    )

    facts: list[ApiCallRecord] = []
    finish_reason = "agent_finish"

    router = _select_api_agent.select(question=q, user_role=role, history=chat_history)
    logger.info("Router decision: action={} api_id={}", router.action, router.api_id)

    if router.action == "call_api" and router.api_id:
        body_decision = _call_api_agent.build_call(
            api_id=router.api_id,
            question=q,
            user_role=role,
            history=chat_history,
        )
        logger.info("Call agent body for {}: {}", router.api_id, body_decision.reason)

        if body_decision.request_body is not None:
            plan = ApiCallPlan(
                api_id=router.api_id,
                request_body=body_decision.request_body,
            )
            record = _execute_plan(
                plan,
                user_role=role,
                auth_cookie=auth_cookie,
                path_params=body_decision.path_params,
            )
            facts.append(record)
            finish_reason = "api_executed"
            logger.info("Executed API {}", router.api_id)
        else:
            finish_reason = "missing_request_body"
            logger.warning("Call agent did not return request_body for {}", router.api_id)
    elif router.action == "call_api":
        finish_reason = "router_empty_api_id"
        logger.warning("Router returned call_api without api_id")
    else:
        finish_reason = router.reason or "router_finish"

    answer_result = _answer_agent.answer(
        q,
        facts,
        history=chat_history,
        finish_reason=finish_reason,
    )
    return ChatResponse(
        answer=answer_result.answer,
        confidence=answer_result.confidence,
        iterations=1,
        api_calls=facts,
        finish_reason=finish_reason,
        user_role=role,
    )
