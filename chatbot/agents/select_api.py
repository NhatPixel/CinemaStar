from __future__ import annotations

from typing import Sequence

from loguru import logger

from ..api.schemas import ApiRouterDecision, ChatHistoryMessage
from ..apis import API_CATALOG, apis_for_role, normalize_user_role
from ..config import settings
from ..prompts.select_api import build_select_api_system_prompt, build_select_api_user_prompt
from .base import BaseAgent


class SelectApiAgent(BaseAgent):
    """Chọn api_id dựa trên mô tả chức năng ngắn của từng API."""

    def select(
        self,
        question: str,
        user_role: str = "CUSTOMER",
        history: Sequence[ChatHistoryMessage] | None = None,
    ) -> ApiRouterDecision:
        if not self.azure_endpoint or not self.azure_api_key:
            raise RuntimeError("Azure OpenAI is not configured")

        system_prompt = build_select_api_system_prompt(user_role)
        user_prompt = build_select_api_user_prompt(
            question=question,
            user_role=user_role,
            history=history,
        )

        parsed, _ = self.parse(
            self.model,
            (system_prompt, user_prompt, settings.SELECT_API_LLM_TEMPERATURE),
            ApiRouterDecision,
            settings.SELECT_API_LLM_MAX_TOKENS,
        )
        return self._normalize(parsed, user_role)

    def _normalize(self, decision: ApiRouterDecision, user_role: str) -> ApiRouterDecision:
        if decision.action == "finish":
            return decision

        api_id = (decision.api_id or "").strip()
        allowed = apis_for_role(user_role)
        if not api_id or api_id not in API_CATALOG:
            logger.warning("Router invalid api_id: %s", api_id)
            return ApiRouterDecision(
                action="finish",
                api_id=None,
                reason=decision.reason or "api_id không hợp lệ.",
            )
        if api_id not in allowed:
            logger.warning("Router api_id %s not allowed for role %s", api_id, user_role)
            return ApiRouterDecision(
                action="finish",
                api_id=None,
                reason=decision.reason or f"Vai trò {normalize_user_role(user_role)} không gọi được {api_id}.",
            )

        return decision.model_copy(update={"api_id": api_id})
