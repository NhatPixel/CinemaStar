from __future__ import annotations

import re
import unicodedata
from datetime import date as date_cls, datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import UUID

from loguru import logger

from ..agents import AnswerAgent, CallApiAgent, SelectApiAgent
from ..api.schemas import (
    ApiCallPlan,
    ApiCallRecord,
    ChatHistoryMessage,
    ChatResponse,
    SearchFilmsRequestBody,
    request_body_to_dict,
)
from ..apis import ApiExecutionError, build_request_summary, execute
from ..apis.catalog import normalize_user_role
from ..prompts.history import CHAT_HISTORY_LIMIT, normalize_chat_history
from .auth_context import BackendApiResponseError, resolve_user_role

_select_api_agent = SelectApiAgent()
_call_api_agent = CallApiAgent()
_answer_agent = AnswerAgent()


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _normalize_text(text: str) -> str:
    return _strip_accents(text).casefold()


def _normalize_text_with_map(text: str) -> tuple[str, list[int]]:
    normalized_parts: list[str] = []
    index_map: list[int] = []
    for index, char in enumerate(text):
        stripped = "".join(
            ch for ch in unicodedata.normalize("NFD", char) if not unicodedata.combining(ch)
        )
        if not stripped:
            continue
        normalized_parts.append(stripped)
        index_map.extend([index] * len(stripped))
    return "".join(normalized_parts).casefold(), index_map


def _truncate_text_at_patterns(text: str, patterns: tuple[str, ...]) -> str:
    normalized, index_map = _normalize_text_with_map(text)
    if not normalized:
        return text

    cut_positions: list[int] = []
    for pattern in patterns:
        match = re.search(pattern, normalized, flags=re.IGNORECASE)
        if match:
            cut_positions.append(match.start())

    if not cut_positions:
        return text

    cut_index = min(cut_positions)
    if cut_index <= 0:
        return ""
    if cut_index >= len(index_map):
        return text
    return text[: index_map[cut_index]].strip(" .,!?:;")


def _today_in_vietnam() -> date_cls:
    return datetime.now(ZoneInfo("Asia/Ho_Chi_Minh")).date()


def _showtime_date_candidates(question: str) -> list[date_cls]:
    explicit_date = _extract_showtime_date(question)
    if explicit_date is not None:
        return [explicit_date]
    today = _today_in_vietnam()
    return [today + timedelta(days=offset) for offset in range(0, 8)]


def _extract_showtime_date(question: str) -> date_cls | None:
    raw = question.strip()
    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", raw)
    if match:
        try:
            return date_cls.fromisoformat(match.group(1))
        except ValueError:
            return None

    normalized = _normalize_text(raw)
    if re.search(r"\b(ngay mai|mai|tomorrow)\b", normalized):
        return _today_in_vietnam() + timedelta(days=1)
    if re.search(r"\b(hom nay|toi nay|today|tonight|nay)\b", normalized):
        return _today_in_vietnam()
    return None


def _extract_cinema_keyword(question: str) -> str | None:
    raw = re.sub(r"\s+", " ", question).strip()
    patterns = (
        r"(?:rạp|rap)\s+(.+)$",
        r"(?:ở|o|tại|tai)\s+rạp\s+(.+)$",
        r"(?:ở|o|tại|tai)\s+(.+?)\s+(?:rạp|rap)\b",
    )

    for pattern in patterns:
        match = re.search(pattern, raw, flags=re.IGNORECASE)
        if not match:
            continue
        keyword = match.group(1).strip(" .,!?:;")
        stop_patterns = (
            r"\s+(?:cho tôi|cho toi|giúp tôi|giup toi|làm ơn|lam on)\b",
            r"\s+(?:ngày mai|ngay mai|hôm nay|hom nay|tối nay|toi nay)\b",
            r"\s+(?:suất chiếu|suat chieu|lịch chiếu|lich chieu|có suất|co suat)\b",
            r"\s+(?:của|cua|và|va|lúc|luc|lúc mấy|luc may|mấy|may)\b",
            r"\s+(?:luôn nha|luon nha|nhé|nhe|nha|ạ|a)\b",
        )
        for pattern in stop_patterns:
            stop = re.search(pattern, keyword, flags=re.IGNORECASE)
            if stop:
                keyword = keyword[: stop.start()].strip(" .,!?:;")
        keyword = re.sub(
            r"\s+(?:ạ|á|à|ơi|oi|nhé|nhe|nha)$",
            "",
            keyword,
            flags=re.IGNORECASE,
        ).strip()
        if keyword:
            return keyword

    return None


def _extract_film_title(question: str) -> str | None:
    raw = re.sub(r"\s+", " ", question).strip()
    normalized = _normalize_text(raw)
    if "phim" not in normalized and "film" not in normalized:
        return None

    match = re.search(r"\b(?:phim|film)\b\s+(.+)", raw, flags=re.IGNORECASE)
    if not match:
        return None

    candidate = match.group(1).strip(" .,!?:;")
    candidate = _truncate_text_at_patterns(
        candidate,
        (
            r"\b(?:cho toi|giup toi|lam on)\b",
            r"\b(?:o|tai)\s+rap\b",
            r"\brap\b",
            r"\b(?:toi nay|hom nay|ngay mai|tomorrow|today|tonight|chieu nay|sang nay)\b",
            r"\b(?:vao\s+ngay|ngay\s+\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|ngay\s+\d{1,2})\b",
            r"\b(?:luc|vao\s+luc|khoang)\b",
        ),
    )
    stop_patterns = (
        r"\s+(?:cho tôi|cho toi|giúp tôi|giup toi|làm ơn|lam on)\b",
        r"\s+(?:ở|o|tại|tai)\s+rạp\b",
        r"\s+(?:rạp|rap)\b",
        r"\s+(?:tối nay|toi nay|hôm nay|hom nay|ngày mai|ngay mai)\b",
        r"\s+(?:chiều nay|chieu nay|sáng nay|sang nay)\b",
    )
    for pattern in stop_patterns:
        stop = re.search(pattern, candidate, flags=re.IGNORECASE)
        if stop:
            candidate = candidate[: stop.start()].strip(" .,!?:;")

    return candidate or None


_GENERIC_FILM_REFERENCES = {
    "film nay",
    "phim nay",
    "film do",
    "phim do",
    "film kia",
    "phim kia",
    "nay",
    "do",
    "kia",
}


def _is_generic_film_reference(title: str | None) -> bool:
    if not title:
        return False
    normalized = _normalize_text(title).strip()
    if not normalized:
        return True
    if normalized in _GENERIC_FILM_REFERENCES:
        return True
    if normalized in {"this film", "that film", "this movie", "that movie"}:
        return True
    return False


def _extract_contextual_film_title(
    question: str,
    history: list[ChatHistoryMessage] | None,
) -> str | None:
    current_title = _extract_film_title(question)
    if current_title and not _is_generic_film_reference(current_title):
        return current_title

    for msg in reversed(history or []):
        historical_title = _extract_film_title(msg.content)
        if historical_title and not _is_generic_film_reference(historical_title):
            return historical_title

    return current_title if current_title and not _is_generic_film_reference(current_title) else None


def _extract_contextual_cinema_keyword(
    question: str,
    history: list[ChatHistoryMessage] | None,
) -> str | None:
    current_keyword = _extract_cinema_keyword(question)
    if current_keyword:
        return current_keyword

    for msg in reversed(history or []):
        historical_keyword = _extract_cinema_keyword(msg.content)
        if historical_keyword:
            return historical_keyword

    return None


def _response_items(record: ApiCallRecord) -> list[dict[str, object]]:
    response = record.response
    if not isinstance(response, dict):
        return []
    data = response.get("data")
    if isinstance(data, dict):
        items = data.get("data")
        if isinstance(items, list):
            return [item for item in items if isinstance(item, dict)]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def _pick_cinema_item(question: str, items: list[dict[str, object]]) -> dict[str, object] | None:
    if not items:
        return None
    if len(items) == 1:
        return items[0]

    keyword = _normalize_text(_extract_cinema_keyword(question) or "")
    if not keyword:
        return items[0]

    for item in items:
        for key in ("name", "code", "address"):
            value = item.get(key)
            if isinstance(value, str) and keyword in _normalize_text(value):
                return item

    return items[0]


def _pick_film_item(film_title: str, items: list[dict[str, object]]) -> dict[str, object] | None:
    if not items:
        return None
    if len(items) == 1:
        return items[0]

    candidates = _rank_film_items(film_title, items)
    if candidates:
        return candidates[0]

    return None


def _rank_film_items(film_title: str, items: list[dict[str, object]]) -> list[dict[str, object]]:
    normalized_title = _normalize_text(film_title)
    scored_items: list[tuple[int, int, dict[str, object]]] = []
    for item in items:
        title = item.get("title") or item.get("name")
        if not isinstance(title, str):
            continue
        normalized_item = _normalize_text(title)
        score = 0
        if normalized_item == normalized_title:
            score = 4
        elif normalized_item.startswith(normalized_title):
            score = 3
        elif normalized_title in normalized_item:
            score = 2
        elif normalized_item and normalized_item in normalized_title:
            score = 1
        if score:
            scored_items.append((score, len(normalized_item), item))

    if scored_items:
        scored_items.sort(key=lambda entry: (-entry[0], entry[1]))
        return [entry[2] for entry in scored_items]

    return []


def _normalize_uuid_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        return str(UUID(candidate))
    except ValueError:
        return None


def _execute_showtime_lookup_for_films(
    film_items: list[dict[str, object]],
    *,
    user_role: str,
    auth_cookie: str | None,
    showtime_date: date_cls,
    cinema_id: str | None = None,
    film_title: str | None = None,
    limit: int = 8,
) -> list[ApiCallRecord]:
    selected_items = film_items[:limit]
    if film_title:
        ranked_items = _rank_film_items(film_title, film_items)
        if ranked_items:
            selected_items = ranked_items[:limit]

    logger.info(
        "Showtime lookup prepared film_items={} selected_items={} showtime_date={} cinema_id={} film_title={}",
        len(film_items),
        len(selected_items),
        showtime_date.isoformat(),
        cinema_id or "-",
        film_title or "-",
    )

    records: list[ApiCallRecord] = []
    for item in selected_items:
        film_id = _normalize_uuid_text(item.get("id") or item.get("filmId"))
        if film_id is None:
            logger.warning(
                "Skip showtime lookup because film item does not contain a valid UUID id: {}",
                item,
            )
            continue

        showtime_request_payload: dict[str, object] = {
            "page": 1,
            "size": 10,
            "date": showtime_date.isoformat(),
        }
        if cinema_id:
            showtime_request_payload["cinemaId"] = cinema_id

        showtime_request = SearchFilmsRequestBody.model_validate(showtime_request_payload)
        records.append(
            _execute_plan(
                ApiCallPlan(api_id="search_showtimes_by_film", request_body=showtime_request),
                user_role=user_role,
                auth_cookie=auth_cookie,
                path_params={"filmId": film_id},
            )
        )

    return records


def _lookup_showtimes_by_film_date_window(
    film_items: list[dict[str, object]],
    *,
    user_role: str,
    auth_cookie: str | None,
    question: str,
    cinema_id: str | None = None,
    film_title: str | None = None,
) -> list[ApiCallRecord]:
    facts: list[ApiCallRecord] = []
    candidates = _showtime_date_candidates(question)
    logger.info(
        "Showtime date window candidate_count={} candidates={}",
        len(candidates),
        [candidate.isoformat() for candidate in candidates],
    )
    for showtime_date in candidates:
        day_records = _execute_showtime_lookup_for_films(
            film_items,
            user_role=user_role,
            auth_cookie=auth_cookie,
            showtime_date=showtime_date,
            cinema_id=cinema_id,
            film_title=film_title,
        )
        logger.info(
            "Showtime date window attempt date={} api_calls={}",
            showtime_date.isoformat(),
            len(day_records),
        )
        if day_records:
            facts.extend(day_records)
            return facts

    return facts


def _build_customer_showtime_facts(
    question: str,
    *,
    user_role: str,
    auth_cookie: str | None,
    history: list[ChatHistoryMessage] | None = None,
) -> list[ApiCallRecord] | None:
    normalized = _normalize_text(question)
    if user_role not in {"CUSTOMER", "ADMIN", "MANAGER", "STAFF"}:
        return None
    if not any(token in normalized for token in ("suat chieu", "lich chieu", "co suat", "chieu", "showtime")):
        return None
    explicit_showtime_date = _extract_showtime_date(question)
    cinema_keyword = _extract_contextual_cinema_keyword(question, history)
    film_title = _extract_contextual_film_title(question, history)

    logger.info(
        "Showtime flow start role={} question={} explicit_date={} cinema_keyword={} film_title={}",
        user_role,
        question,
        explicit_showtime_date.isoformat() if explicit_showtime_date else "-",
        cinema_keyword or "-",
        film_title or "-",
    )

    if film_title:
        facts: list[ApiCallRecord] = []
        cinema_id: str | None = None

        if cinema_keyword:
            cinema_request = SearchFilmsRequestBody.model_validate(
                {
                    "size": 10,
                    "keyword": cinema_keyword,
                    "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "ACTIVE"}],
                    "sortBy": [{"field": "CREATED_AT", "direction": "ASC"}],
                }
            )
            cinema_plan = ApiCallPlan(api_id="search_cinemas", request_body=cinema_request)
            cinema_record = _execute_plan(
                cinema_plan,
                user_role=user_role,
                auth_cookie=auth_cookie,
            )
            facts.append(cinema_record)
            logger.info(
                "Showtime flow step=search_cinemas role={} api_calls={} request={}",
                user_role,
                len(facts),
                cinema_record.request_summary,
            )

            cinema_items = _response_items(cinema_record)
            chosen_cinema = _pick_cinema_item(question, cinema_items)
            cinema_value = chosen_cinema.get("id") if chosen_cinema else None
            if isinstance(cinema_value, str) and cinema_value.strip():
                cinema_id = cinema_value.strip()

        film_items: list[dict[str, object]] = []
        film_request_payload: dict[str, object] = {
            "size": 10,
            "keyword": film_title,
            "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "NOW_SHOWING"}],
            "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
        }
        if cinema_id:
            film_request_payload["cinemaId"] = cinema_id
        if explicit_showtime_date is not None:
            film_request_payload["showtimeDate"] = explicit_showtime_date.isoformat()

        film_request = SearchFilmsRequestBody.model_validate(film_request_payload)
        film_api_id = "search_films_customer"
        film_record = _execute_plan(
            ApiCallPlan(api_id=film_api_id, request_body=film_request),
            user_role=user_role,
            auth_cookie=auth_cookie,
        )
        facts.append(film_record)
        logger.info(
            "Showtime flow step={} role={} api_calls={} request={} film_items={}",
            film_api_id,
            user_role,
            len(facts),
            film_record.request_summary,
            len(_response_items(film_record)),
        )

        film_items = _response_items(film_record)
        if film_items:
            showtime_records = _lookup_showtimes_by_film_date_window(
                film_items,
                user_role=user_role,
                auth_cookie=auth_cookie,
                question=question,
                cinema_id=cinema_id,
                film_title=film_title,
            )
            facts.extend(showtime_records)
            logger.info(
                "Showtime flow step=search_showtimes_by_film role={} api_calls={} returned_records={}",
                user_role,
                len(facts),
                len(showtime_records),
            )

        if not film_items:
            logger.info("Showtime flow finished early because film search returned no items role={}", user_role)
            return facts
        logger.info("Showtime flow finished with api_calls={} role={}", len(facts), user_role)
        return facts

    if not cinema_keyword:
        return None

    cinema_request = SearchFilmsRequestBody.model_validate(
        {
            "size": 10,
            "keyword": cinema_keyword,
            "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "ACTIVE"}],
            "sortBy": [{"field": "CREATED_AT", "direction": "ASC"}],
        }
    )
    cinema_plan = ApiCallPlan(api_id="search_cinemas", request_body=cinema_request)
    cinema_record = _execute_plan(
        cinema_plan,
        user_role=user_role,
        auth_cookie=auth_cookie,
    )

    facts = [cinema_record]
    logger.info(
        "Showtime flow step=search_cinemas role={} api_calls={} request={}",
        user_role,
        len(facts),
        cinema_record.request_summary,
    )
    cinema_items = _response_items(cinema_record)
    chosen_cinema = _pick_cinema_item(question, cinema_items)
    cinema_id = chosen_cinema.get("id") if chosen_cinema else None
    if not isinstance(cinema_id, str) or not cinema_id.strip():
        logger.info("Showtime flow stopped because no valid cinema_id was resolved role={}", user_role)
        return facts

    films_request_payload: dict[str, object] = {
        "size": 10,
        "cinemaId": cinema_id,
        "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "NOW_SHOWING"}],
        "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
    }
    if explicit_showtime_date is not None:
        films_request_payload["showtimeDate"] = explicit_showtime_date.isoformat()

    films_request = SearchFilmsRequestBody.model_validate(films_request_payload)
    films_plan = ApiCallPlan(api_id="search_films_customer", request_body=films_request)
    films_record = _execute_plan(
        films_plan,
        user_role=user_role,
        auth_cookie=auth_cookie,
    )
    facts.append(films_record)
    logger.info(
        "Showtime flow step=search_films_customer role={} api_calls={} request={} film_items={}",
        user_role,
        len(facts),
        films_record.request_summary,
        len(_response_items(films_record)),
    )

    film_items = _response_items(films_record)
    if film_items:
        showtime_records = _lookup_showtimes_by_film_date_window(
            film_items,
            user_role=user_role,
            auth_cookie=auth_cookie,
            question=question,
            cinema_id=cinema_id,
        )
        facts.extend(showtime_records)
        logger.info(
            "Showtime flow step=search_showtimes_by_film role={} api_calls={} returned_records={}",
            user_role,
            len(facts),
            len(showtime_records),
        )

    logger.info("Showtime flow finished with api_calls={} role={}", len(facts), user_role)
    return facts


def _params_from_plan(
    plan: ApiCallPlan,
    path_params: dict[str, str] | None = None,
) -> tuple[dict[str, str], dict[str, str]]:
    resolved: dict[str, str] = {}
    if path_params:
        for key, value in path_params.items():
            text = str(value or "").strip()
            if text:
                resolved[key] = text
    return resolved, {}


def _raise_if_backend_error(exc: ApiExecutionError) -> None:
    if exc.backend_response is not None:
        raise BackendApiResponseError(exc.status_code, exc.backend_response) from exc


def _execute_plan(
    plan: ApiCallPlan,
    *,
    user_role: str,
    auth_cookie: str | None,
    path_params: dict[str, str] | None = None,
) -> ApiCallRecord:
    """Gọi CinemaStar API — luôn forward auth_cookie nếu khách đã đăng nhập."""
    api_id = plan.api_id.strip()
    path_params, query_params = _params_from_plan(plan, path_params)
    request_body = request_body_to_dict(plan.request_body, api_id=api_id)
    summary = build_request_summary(api_id, path_params, query_params, request_body)
    logger.info(
        "API call start api_id={} role={} path_params={} query_params={} request_body={}",
        api_id,
        user_role,
        path_params,
        query_params,
        request_body,
    )

    try:
        response = execute(
            api_id=api_id,
            user_role=user_role,
            auth_cookie=auth_cookie,
            path_params=path_params,
            query_params=query_params,
            request_body=request_body,
        )
    except ApiExecutionError as exc:
        logger.warning("Cinema API error [{}]: {} summary={}", api_id, exc, summary)
        logger.info(
            "API call failed api_id={} status_code={} summary={}",
            api_id,
            exc.status_code,
            summary,
        )
        _raise_if_backend_error(exc)
        return ApiCallRecord(
            api_id=api_id,
            request_summary=summary,
            response={"error": str(exc), "status_code": exc.status_code},
        )

    logger.info("API call success api_id={} summary={}", api_id, summary)
    return ApiCallRecord(
        api_id=api_id,
        request_summary=summary,
        response=response,
    )


def run_chat(
    question: str,
    *,
    auth_cookie: str | None = None,
    history: list[ChatHistoryMessage] | None = None,
) -> ChatResponse:
    q = (question or "").strip()
    if not q:
        raise ValueError("question must not be empty")

    chat_history = normalize_chat_history(history)
    role = normalize_user_role(resolve_user_role(auth_cookie))
    logger.info(
        "Chat session role={} cookie={} history={}/{}",
        role,
        "yes" if auth_cookie else "no",
        len(chat_history),
        CHAT_HISTORY_LIMIT,
    )

    facts: list[ApiCallRecord] = []
    finish_reason = "agent_finish"

    special_facts = _build_customer_showtime_facts(
        q,
        user_role=role,
        auth_cookie=auth_cookie,
        history=chat_history,
    )
    if special_facts is not None:
        facts = special_facts
        finish_reason = "api_executed"
        logger.info(
            "Special-case showtime flow executed with {} API call(s) role={} api_ids={}",
            len(facts),
            role,
            [fact.api_id for fact in facts],
        )
    else:
        router = _select_api_agent.select(question=q, user_role=role, history=chat_history)
        logger.info("Router decision: action={} api_id={}", router.action, router.api_id)

        if router.action == "call_api" and router.api_id:
            body_decision = _call_api_agent.build_call(
                api_id=router.api_id,
                question=q,
                user_role=role,
                history=chat_history,
            )
            logger.info("Call agent body for {}: {}", router.api_id, body_decision.reason)

            if body_decision.request_body is not None:
                plan = ApiCallPlan(
                    api_id=router.api_id,
                    request_body=body_decision.request_body,
                )
                record = _execute_plan(
                    plan,
                    user_role=role,
                    auth_cookie=auth_cookie,
                    path_params=body_decision.path_params,
                )
                facts.append(record)
                finish_reason = "api_executed"
                logger.info(
                    "Executed API {} total_api_calls={} api_ids={}",
                    router.api_id,
                    len(facts),
                    [fact.api_id for fact in facts],
                )
            else:
                finish_reason = "missing_request_body"
                logger.warning("Call agent did not return request_body for {}", router.api_id)
        elif router.action == "call_api":
            finish_reason = "router_empty_api_id"
            logger.warning("Router returned call_api without api_id")
        else:
            finish_reason = router.reason or "router_finish"

    logger.info(
        "Chat turn finished finish_reason={} total_api_calls={} api_ids={}",
        finish_reason,
        len(facts),
        [fact.api_id for fact in facts],
    )

    answer_result = _answer_agent.answer(
        q,
        facts,
        history=chat_history,
        finish_reason=finish_reason,
    )
    return ChatResponse(
        answer=answer_result.answer,
        confidence=answer_result.confidence,
        iterations=max(1, len(facts)),
        api_calls=facts,
        finish_reason=finish_reason,
        user_role=role,
    )
