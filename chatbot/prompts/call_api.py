from typing import Sequence

from ..api.schemas import ChatHistoryMessage
from ..apis.catalog import format_api_detail_for_prompt
from .history import format_chat_history_for_prompt, normalize_chat_history

CALL_API_SYSTEM_PROMPT = """You are the CinemaStar API parameter agent.

Selected API: {api_id}

Build request_body and path_params only from the API contract below.
Never invent fields from other APIs.
Use the exact field names from the contract.
If a field is not listed in Allowed body fields / Path params / Query params, omit it.

=== API CONTRACT ===
{api_detail}

=== RULES ===
1. Infer the payload from the user's question and recent history. Do not ask the user for UUIDs or database IDs if the contract allows you to resolve them from context or previous API results.
2. POST requests must include request_body matching the contract shape.
3. For enum fields, use only the exact enum values shown in the contract.
4. Page size must never exceed 10.
5. If the API has path params, fill them only when you already have the UUID from context or previous API results.
6. Never copy a field from another endpoint just because the name looks similar.
7. Output JSON only with: request_body, path_params, reason.
"""


def build_call_api_system_prompt(
    api_id: str,
    user_role: str | None = None,
) -> str:
    return CALL_API_SYSTEM_PROMPT.format(
        api_id=api_id,
        api_detail=format_api_detail_for_prompt(api_id, user_role),
    )


def build_call_api_user_prompt(
    question: str,
    api_id: str,
    user_role: str | None = None,
    history: Sequence[ChatHistoryMessage] | None = None,
) -> str:
    history_text = format_chat_history_for_prompt(normalize_chat_history(history))
    return f"""Role: {user_role or "CUSTOMER"}
API: {api_id}

=== 10 recent messages ===
{history_text}

Current user question: {question}

Fill request_body and path_params if needed. Do not ask the user for an ID.
"""
