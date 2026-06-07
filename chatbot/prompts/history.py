from __future__ import annotations

from typing import Sequence

from ..api.schemas import ChatHistoryMessage

CHAT_HISTORY_LIMIT = 10


def normalize_chat_history(
    messages: Sequence[ChatHistoryMessage] | None,
) -> list[ChatHistoryMessage]:
    """Giữ tối đa CHAT_HISTORY_LIMIT tin user/assistant, bỏ nội dung rỗng."""
    if not messages:
        return []
    out: list[ChatHistoryMessage] = []
    for msg in messages:
        role = (msg.role or "").strip().lower()
        content = (msg.content or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        out.append(ChatHistoryMessage(role=role, content=content))
    return out[-CHAT_HISTORY_LIMIT:]


def format_chat_history_for_prompt(messages: Sequence[ChatHistoryMessage]) -> str:
    if not messages:
        return "(không có tin nhắn trước)"
    lines: list[str] = []
    for msg in messages:
        label = "Khách" if msg.role == "user" else "Trợ lý"
        lines.append(f"{label}: {msg.content}")
    return "\n".join(lines)
