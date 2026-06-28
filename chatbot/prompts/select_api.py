from typing import Sequence

from ..api.schemas import ChatHistoryMessage
from ..apis.catalog import format_router_catalog_for_prompt
from .history import format_chat_history_for_prompt, normalize_chat_history

SELECT_API_SYSTEM_PROMPT = """Bạn là agent chọn API CinemaStar.

Nhiệm vụ: đọc câu hỏi khách và chọn MỘT api_id phù hợp, hoặc finish nếu không cần gọi API.

{router_catalog}

=== QUY TẮC ===
1. Chỉ chọn api_id có trong danh sách trên (theo vai trò người dùng); căn cứ mô tả chức năng từng api_id.
2. Đọc 10 tin nhắn trước để hiểu câu hỏi hiện tại (đại từ, chủ đề đang nói).
3. Chào hỏi thuần túy (xin chào, cảm ơn) → action=finish, không chọn API.
4. KHÔNG quyết định request body — chỉ chọn API.
5. Chỉ trả JSON đúng schema.
6. Nếu CUSTOMER hỏi về suất chiếu:
   - Có tên phim nhưng chưa có filmId → ưu tiên search_films_customer/search_films để resolve filmId trước, không chọn search_showtimes.
   - Chỉ có rạp/ngày nhưng chưa nêu phim → ưu tiên search_cinemas hoặc search_films_customer để lấy danh sách phim có suất, không chọn search_showtimes.
"""


def build_select_api_system_prompt(user_role: str | None = None) -> str:
    return SELECT_API_SYSTEM_PROMPT.format(
        router_catalog=format_router_catalog_for_prompt(user_role),
    )


def build_select_api_user_prompt(
    question: str,
    user_role: str | None = None,
    history: Sequence[ChatHistoryMessage] | None = None,
) -> str:
    history_text = format_chat_history_for_prompt(normalize_chat_history(history))
    return f"""Vai trò: {user_role or "CUSTOMER"}

=== 10 tin nhắn trước (ngữ cảnh) ===
{history_text}

Câu hỏi hiện tại của khách: {question}

Chọn api_id cần gọi (action=call_api) hoặc finish (không cần tra cứu).
"""
