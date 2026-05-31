from __future__ import annotations

import json
from typing import Sequence

from ..api.schemas import ApiCallRecord

ANSWER_SYSTEM_PROMPT = """You are an answer agent. Synthesize a clear response to the user's question using ONLY the gathered API facts.

Rules:
- Do not invent campaign data, metrics, or ids not present in the facts.
- If facts are insufficient, say what is missing and answer only what is supported.
- Prefer Vietnamese when the user question is in Vietnamese; otherwise match the question language.
- Be concise and factual.
"""


def build_answer_user_prompt(question: str, gathered_facts: Sequence[ApiCallRecord]) -> str:
    facts_json = json.dumps(
        [f.model_dump() for f in gathered_facts],
        ensure_ascii=False,
        indent=2,
    )
    return f"""User question: {question}

Gathered API facts:
{facts_json if gathered_facts else "(no API data collected)"}

Provide the final answer.
"""
