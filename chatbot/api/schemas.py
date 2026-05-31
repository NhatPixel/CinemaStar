from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AgentDecision(BaseModel):
    action: Literal["call_api", "finish"]
    api_id: Optional[str] = Field(
        default=None,
        description="One of: list_campaigns, get_campaign. Required when action is call_api.",
    )
    campaign_id: Optional[str] = Field(
        default=None,
        description="Campaign id for get_campaign (e.g. camp_002).",
    )
    reason: str = Field(description="Why this action was chosen.")
    missing_info: Optional[str] = Field(
        default=None,
        description="What information is still needed (when continuing loop).",
    )


class AnswerLlmResponse(BaseModel):
    answer: str
    confidence: Literal["high", "medium", "low"] = "medium"


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)


class ApiCallRecord(BaseModel):
    api_id: str
    request_summary: str
    response: dict[str, Any]


class ChatResponse(BaseModel):
    answer: str
    confidence: Literal["high", "medium", "low"] = "medium"
    iterations: int
    api_calls: list[ApiCallRecord]
    finish_reason: str
