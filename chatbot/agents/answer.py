from __future__ import annotations

from typing import Sequence

from ..api.schemas import AnswerLlmResponse, ApiCallRecord
from ..config import settings
from ..prompts.answer import ANSWER_SYSTEM_PROMPT, build_answer_user_prompt
from .base import BaseAgent


class AnswerAgent(BaseAgent):
    def answer(self, question: str, gathered_facts: Sequence[ApiCallRecord]) -> AnswerLlmResponse:
        if not self.azure_endpoint or not self.azure_api_key:
            raise RuntimeError("Azure OpenAI is not configured")

        user_prompt = build_answer_user_prompt(question, gathered_facts)
        parsed, _ = self.parse(
            self.model,
            (ANSWER_SYSTEM_PROMPT, user_prompt, settings.ANSWER_LLM_TEMPERATURE),
            AnswerLlmResponse,
            settings.ANSWER_LLM_MAX_TOKENS,
        )
        return parsed
