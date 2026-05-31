from __future__ import annotations

from typing import Sequence

from loguru import logger

from ..api.schemas import AgentDecision, ApiCallRecord
from ..config import settings
from ..mocks.catalog import API_CATALOG
from ..mocks.handlers import build_request_summary, path_params_for_api
from ..prompts.call_api import build_call_api_system_prompt, build_call_api_user_prompt
from .base import BaseAgent


class CallApiAgent(BaseAgent):
    def decide(
        self,
        question: str,
        gathered_facts: Sequence[ApiCallRecord],
        iteration: int,
        max_iterations: int,
    ) -> AgentDecision:
        if not self.azure_endpoint or not self.azure_api_key:
            raise RuntimeError("Azure OpenAI is not configured")

        system_prompt = build_call_api_system_prompt()
        user_prompt = build_call_api_user_prompt(
            question=question,
            gathered_facts=gathered_facts,
            iteration=iteration,
            max_iterations=max_iterations,
        )

        parsed, _ = self.parse(
            self.model,
            (system_prompt, user_prompt, settings.CALL_API_LLM_TEMPERATURE),
            AgentDecision,
            settings.CALL_API_LLM_MAX_TOKENS,
        )
        return self._normalize_decision(parsed, gathered_facts)

    def _normalize_decision(
        self,
        decision: AgentDecision,
        gathered_facts: Sequence[ApiCallRecord],
    ) -> AgentDecision:
        if decision.action == "finish":
            return decision

        api_id = (decision.api_id or "").strip()
        if api_id not in API_CATALOG:
            logger.warning("Invalid api_id from LLM: %s — forcing finish", api_id)
            return AgentDecision(
                action="finish",
                reason=f"Invalid api_id '{api_id}'; stopping loop.",
                missing_info=decision.missing_info,
            )

        path_params = path_params_for_api(api_id, decision.campaign_id)
        summary = build_request_summary(api_id, path_params, {})
        for fact in gathered_facts:
            if fact.api_id == api_id and fact.request_summary == summary:
                logger.info("Duplicate API call detected — forcing finish")
                return AgentDecision(
                    action="finish",
                    reason="Required data already fetched; duplicate call avoided.",
                    missing_info=decision.missing_info,
                )

        return decision
