from __future__ import annotations

from typing import Any, Tuple, TypeVar

from loguru import logger
from openai import AzureOpenAI
from pydantic import BaseModel

from ..config import settings

T = TypeVar("T", bound=BaseModel)

_AZURE_OPENAI_API_VERSION = "2024-08-01-preview"


class BaseAgent:
    def __init__(self):
        self.azure_endpoint = settings.AZURE_OPENAI_ENDPOINT
        self.azure_api_key = settings.AZURE_OPENAI_API_KEY
        self.deployment_name = settings.AZURE_OPENAI_DEPLOYMENT
        self.api_version = _AZURE_OPENAI_API_VERSION
        self._azure_client = None

    @property
    def azure_client(self):
        if self._azure_client is None:
            self._azure_client = AzureOpenAI(
                api_key=self.azure_api_key,
                api_version=self.api_version,
                azure_endpoint=self.azure_endpoint,
            )
        return self._azure_client

    @property
    def model(self) -> str:
        return self.deployment_name

    def parse(
        self,
        model: str,
        req: Tuple[str, str, float],
        response_schema: type[T],
        max_completion_tokens: int,
    ) -> tuple[T, Any]:
        """Parse LLM response into the given Pydantic schema."""
        system_prompt, user_prompt, temperature = req
        try:
            response = self.azure_client.beta.chat.completions.parse(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_schema,
                temperature=temperature,
                max_completion_tokens=max_completion_tokens,
            )
            raw = response.choices[0].message.parsed
            if raw is None:
                raise ValueError("empty parsed message")
            return response_schema.model_validate(raw.model_dump()), response
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            raise
