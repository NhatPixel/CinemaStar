from __future__ import annotations

from typing import Sequence

from loguru import logger

from ..api.schemas import ApiCallBodyDecision, ChatHistoryMessage
from ..apis import API_CATALOG, apis_for_role
from ..config import settings
from ..prompts.call_api import build_call_api_system_prompt, build_call_api_user_prompt
from .base import BaseAgent


class CallApiAgent(BaseAgent):
    """Điền request_body — nhận mô tả đầy đủ của một API đã chọn."""

    def build_call(
        self,
        api_id: str,
        question: str,
        user_role: str = "CUSTOMER",
        history: Sequence[ChatHistoryMessage] | None = None,
    ) -> ApiCallBodyDecision:
        if not self.azure_endpoint or not self.azure_api_key:
            raise RuntimeError("Azure OpenAI is not configured")

        api_id = (api_id or "").strip()
        if api_id not in apis_for_role(user_role):
            raise ValueError(f"api_id không hợp lệ hoặc không được phép: {api_id}")

        system_prompt = build_call_api_system_prompt(api_id, user_role)
        user_prompt = build_call_api_user_prompt(
            question=question,
            api_id=api_id,
            user_role=user_role,
            history=history,
        )

        parsed, _ = self.parse(
            self.model,
            (system_prompt, user_prompt, settings.CALL_API_LLM_TEMPERATURE),
            ApiCallBodyDecision,
            settings.CALL_API_LLM_MAX_TOKENS,
        )
        return self._normalize(parsed, api_id)

    def _normalize(self, decision: ApiCallBodyDecision, api_id: str) -> ApiCallBodyDecision:
        api = API_CATALOG[api_id]
        if api.method == "POST" and not decision.request_body:
            logger.warning("Call agent missing request_body for POST %s", api_id)
            return ApiCallBodyDecision(
                request_body=None,
                reason=decision.reason or "Thiếu request_body.",
            )
        return decision
