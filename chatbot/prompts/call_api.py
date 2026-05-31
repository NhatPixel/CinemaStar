from __future__ import annotations

import json
from typing import Sequence

from ..api.schemas import ApiCallRecord
from ..mocks.catalog import format_catalog_for_prompt

CALL_API_SYSTEM_PROMPT = """You are an API orchestration agent. Your job is to decide whether to call another API or finish gathering data.

Available APIs:
{catalog}

Rules:
- Choose action "call_api" only when more data is needed to answer the user's question.
- Choose action "finish" when gathered facts already contain enough information, or no remaining API can help.
- api_id must be exactly one of the catalog api_id values when action is call_api.
- For get_campaign, set campaign_id (e.g. camp_002).
- Do not repeat the same API call with identical parameters if the response is already in gathered facts.
- Prefer list_campaigns first when you need to discover campaign ids, then get_campaign for details.
- Respond in structured JSON matching the schema only.
"""


def build_call_api_system_prompt() -> str:
    return CALL_API_SYSTEM_PROMPT.format(catalog=format_catalog_for_prompt())


def build_call_api_user_prompt(
    question: str,
    gathered_facts: Sequence[ApiCallRecord],
    iteration: int,
    max_iterations: int,
) -> str:
    facts_json = json.dumps(
        [f.model_dump() for f in gathered_facts],
        ensure_ascii=False,
        indent=2,
    )
    return f"""User question: {question}

Iteration: {iteration} of {max_iterations}
Gathered facts so far:
{facts_json if gathered_facts else "(none yet)"}

Decide the next action: call_api or finish.
"""
