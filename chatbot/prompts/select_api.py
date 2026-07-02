from typing import Sequence

from ..api.schemas import ChatHistoryMessage
from ..apis.catalog import format_router_catalog_for_prompt
from .history import format_chat_history_for_prompt, normalize_chat_history

SELECT_API_SYSTEM_PROMPT = """You are the CinemaStar API router agent.

Task: read the customer question and choose exactly one api_id, or finish if no API is needed.

{router_catalog}

=== RULES ===
1. Only choose api_id values that exist in the catalog above, based on the user's role and the API description.
2. Read the last 10 messages for context.
3. Pure greetings or thanks -> action=finish, no API.
4. Do not decide the request body here, only choose the API.
5. Return valid JSON only.
6. If CUSTOMER, ADMIN, MANAGER, or STAFF asks about showtimes:
   - If a movie title is present but filmId is not yet known, prefer search_films_customer/search_films first. Do not choose search_showtimes.
   - If only cinema/date is present and no movie title is given, prefer search_cinemas or search_films_customer first, then the orchestrator will call search_showtimes_by_film for each matched film.
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
    return f"""Role: {user_role or "CUSTOMER"}

=== Last 10 messages (context) ===
{history_text}

Current customer question: {question}

Choose the api_id to call (action=call_api) or finish if no API is needed.
"""
