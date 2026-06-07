from typing import Sequence

from ..api.schemas import ChatHistoryMessage
from ..apis.catalog import format_api_detail_for_prompt
from .history import format_chat_history_for_prompt, normalize_chat_history

CALL_API_SYSTEM_PROMPT = """Bạn là agent điền tham số gọi API CinemaStar.

API đã được chọn: {api_id}

Bạn quyết định request_body và path_params (nếu API có {{filmId}}, {{cinemaId}} trong path) theo spec bên dưới.
Hệ thống sẽ gọi API thay bạn — KHÔNG chọn api_id khác.

=== SPEC API (đầy đủ) ===
{api_detail}

=== QUY TẮC ===
1. Tự suy luận body từ câu hỏi khách — KHÔNG yêu cầu khách cung cấp UUID/mã id.
2. POST: bắt buộc request_body JSON đầy đủ theo spec.
3. Dùng đúng mã enum (STATUS, AGE_RATING, ...) như trong spec.
4. Field size tối đa 10 bản ghi mỗi lần gọi.
5. API có path_params: điền path_params.filmId hoặc cinemaId (UUID từ ngữ cảnh / API trước), không hỏi khách.
6. Chỉ trả JSON đúng schema (request_body, path_params, reason).
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
    return f"""Vai trò: {user_role or "CUSTOMER"}
API: {api_id}

=== 10 tin nhắn trước (ngữ cảnh) ===
{history_text}

Câu hỏi hiện tại của khách: {question}

Điền request_body và path_params (nếu cần) để trả lời câu hỏi (không hỏi khách mã id).
"""
