from __future__ import annotations

from loguru import logger

from ..agents import AnswerAgent, CallApiAgent
from ..api.schemas import ApiCallRecord, ChatResponse
from ..config import settings
from ..mocks.catalog import API_CATALOG
from ..mocks.handlers import (
    MockApiError,
    build_request_summary,
    execute,
    path_params_for_api,
)

_call_api_agent = CallApiAgent()
_answer_agent = AnswerAgent()


def run_chat(question: str) -> ChatResponse:
    q = (question or "").strip()
    if not q:
        raise ValueError("question must not be empty")

    max_iterations = max(1, settings.CHATBOT_MAX_ITERATIONS)
    facts: list[ApiCallRecord] = []
    finish_reason = "max_iterations_reached"
    iterations = 0

    for i in range(1, max_iterations + 1):
        iterations = i
        decision = _call_api_agent.decide(
            question=q,
            gathered_facts=facts,
            iteration=i,
            max_iterations=max_iterations,
        )

        if decision.action == "finish":
            finish_reason = decision.reason or "agent_finish"
            break

        api_id = (decision.api_id or "").strip()
        if api_id not in API_CATALOG:
            finish_reason = f"invalid_api_id:{api_id}"
            break

        path_params = path_params_for_api(api_id, decision.campaign_id)

        try:
            response = execute(
                api_id=api_id,
                path_params=path_params,
                query_params={},
            )
        except MockApiError as exc:
            logger.warning("Mock API error: %s", exc)
            facts.append(
                ApiCallRecord(
                    api_id=api_id,
                    request_summary=build_request_summary(api_id, path_params, {}),
                    response={"error": str(exc), "status_code": exc.status_code},
                )
            )
            finish_reason = f"api_error:{exc}"
            continue

        facts.append(
            ApiCallRecord(
                api_id=api_id,
                request_summary=build_request_summary(api_id, path_params, {}),
                response=response,
            )
        )

    answer_result = _answer_agent.answer(q, facts)
    return ChatResponse(
        answer=answer_result.answer,
        confidence=answer_result.confidence,
        iterations=iterations,
        api_calls=facts,
        finish_reason=finish_reason,
    )
