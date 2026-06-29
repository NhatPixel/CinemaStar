from __future__ import annotations

from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..apis.catalog import MAX_API_LIST_SIZE, clamp_request_body_sizes

RequestBody = dict[str, Any]


class FilterByItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str = Field(description="TITLE | STATUS | COUNTRY | ...")
    operator: str = Field(description="EQ | IN | LIKE | GTE | LTE | BETWEEN")
    value: Union[str, int, list[str], list[int]] = Field(
        description="Giá trị lọc. STATUS: NOW_SHOWING | COMING_SOON | ..."
    )


class SortByItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str = Field(description="TIME_CREATED | RELEASE_DATE | ...")
    direction: str = Field(description="ASC | DESC")


class DateRangeBody(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    from_: Optional[str] = Field(default=None, alias="from")
    to: Optional[str] = None


class PageRequestBody(BaseModel):
    """page/size/keyword/filterBy/sortBy — API search phân trang và pageRequest báo cáo."""

    model_config = ConfigDict(extra="forbid")

    page: Optional[int] = Field(default=1, ge=1)
    size: Optional[int] = Field(
        default=MAX_API_LIST_SIZE,
        ge=1,
        le=MAX_API_LIST_SIZE,
    )
    keyword: Optional[str] = None
    filterBy: Optional[list[FilterByItem]] = None
    sortBy: Optional[list[SortByItem]] = None


_PAGE_BODY_API_IDS = {
    "search_cinemas",
    "search_my_managed_cinemas",
    "search_halls",
    "search_showtimes",
    "search_pricing_policies",
    "search_staffs",
    "search_customers",
    "search_managers",
    "search_promotions",
    "search_my_active_bookings",
    "search_my_booking_history",
    "search_operator_bookings",
    "search_operator_purchased_bookings",
    "search_operator_unpaid_bookings",
    "search_my_payment_sessions",
    "search_operator_products",
    "search_products_by_cinema",
}

_FILM_BODY_API_IDS = {"search_films", "search_films_customer"}
_SHOWTIME_BY_FILM_API_IDS = {"search_showtimes_by_film"}
_REVENUE_REPORT_API_IDS = {
    "search_payment_revenues_cinemas",
    "search_payment_revenues_cinemas_me",
    "search_booking_revenues_cinemas",
    "search_booking_revenues_cinemas_me",
}
_SHOWTIME_REPORT_API_IDS = {"search_showtime_reports", "search_showtime_reports_me"}

_PAGE_BODY_KEYS = {"page", "size", "keyword", "filterBy", "sortBy"}
_FILM_BODY_KEYS = _PAGE_BODY_KEYS | {"cursor", "dateRange", "showtimeDate"}
_FILM_CUSTOMER_BODY_KEYS = _FILM_BODY_KEYS | {"cinemaId"}
_SHOWTIME_BY_FILM_BODY_KEYS = {"page", "size", "date", "cinemaId"}
_REVENUE_REPORT_BODY_KEYS = {"dateRange", "cinemaIds", "filmIds", "selectedIds", "pageRequest"}
_SHOWTIME_REPORT_BODY_KEYS = {"dateRange", "cinemaIds", "filmIds", "pageRequest"}

_SORT_FIELD_ALIASES: dict[str, dict[str, str]] = {
    "search_cinemas": {"TIME_CREATED": "CREATED_AT"},
    "search_my_managed_cinemas": {"TIME_CREATED": "CREATED_AT"},
}

_PAGE_REQUEST_KEYS = {"page", "size", "keyword", "filterBy", "sortBy"}


def _prune_to_allowed_keys(raw: dict[str, Any], allowed_keys: set[str]) -> dict[str, Any]:
    return {key: value for key, value in raw.items() if key in allowed_keys}


def _normalize_sort_fields(raw: dict[str, Any], api_id: str) -> dict[str, Any]:
    alias_map = _SORT_FIELD_ALIASES.get(api_id)
    if not alias_map:
        return raw

    sort_by = raw.get("sortBy")
    if not isinstance(sort_by, list):
        return raw

    normalized: list[dict[str, Any]] = []
    for item in sort_by:
        if not isinstance(item, dict):
            normalized.append(item)
            continue
        normalized_item = dict(item)
        field = normalized_item.get("field")
        if isinstance(field, str):
            normalized_item["field"] = alias_map.get(field, field)
        normalized.append(normalized_item)

    raw = dict(raw)
    raw["sortBy"] = normalized
    return raw


def _sanitize_page_request(raw: dict[str, Any]) -> dict[str, Any]:
    return _prune_to_allowed_keys(raw, _PAGE_REQUEST_KEYS)


def _sanitize_request_body_for_api(
    api_id: str | None,
    raw: dict[str, Any],
) -> dict[str, Any]:
    if not api_id:
        return clamp_request_body_sizes(raw)

    sanitized = dict(raw)

    if api_id in _FILM_BODY_API_IDS:
        if "showtimeDate" not in sanitized and "date" in sanitized:
            sanitized["showtimeDate"] = sanitized["date"]
        sanitized = _prune_to_allowed_keys(
            sanitized,
            _FILM_CUSTOMER_BODY_KEYS if api_id == "search_films_customer" else _FILM_BODY_KEYS,
        )
    elif api_id in _SHOWTIME_BY_FILM_API_IDS:
        if "date" not in sanitized and "showtimeDate" in sanitized:
            sanitized["date"] = sanitized["showtimeDate"]
        sanitized = _prune_to_allowed_keys(sanitized, _SHOWTIME_BY_FILM_BODY_KEYS)
    elif api_id in _PAGE_BODY_API_IDS:
        sanitized = _prune_to_allowed_keys(sanitized, _PAGE_BODY_KEYS)
        sanitized = _normalize_sort_fields(sanitized, api_id)
    elif api_id in _REVENUE_REPORT_API_IDS:
        sanitized = _prune_to_allowed_keys(sanitized, _REVENUE_REPORT_BODY_KEYS)
        page_request = sanitized.get("pageRequest")
        if isinstance(page_request, dict):
            sanitized["pageRequest"] = _sanitize_page_request(page_request)
    elif api_id in _SHOWTIME_REPORT_API_IDS:
        sanitized = _prune_to_allowed_keys(sanitized, _SHOWTIME_REPORT_BODY_KEYS)
        page_request = sanitized.get("pageRequest")
        if isinstance(page_request, dict):
            sanitized["pageRequest"] = _sanitize_page_request(page_request)
    else:
        sanitized = clamp_request_body_sizes(sanitized)

    return clamp_request_body_sizes(sanitized)


class SearchFilmsRequestBody(BaseModel):
    """Body POST các API /search — schema cho Azure structured output."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    size: Optional[int] = Field(
        default=None,
        ge=1,
        le=MAX_API_LIST_SIZE,
        description=f"Số bản ghi (cursor hoặc page, tối đa {MAX_API_LIST_SIZE})",
    )
    cursor: Optional[str] = None
    page: Optional[int] = Field(default=None, ge=1)
    keyword: Optional[str] = Field(default=None, description="Từ khóa tìm kiếm tự do")
    filterBy: Optional[list[FilterByItem]] = None
    sortBy: Optional[list[SortByItem]] = None
    dateRange: Optional[DateRangeBody] = None
    showtimeDate: Optional[str] = Field(
        default=None,
        description="Ngày yyyy-MM-dd — ưu tiên cho luồng phim/suất chiếu của khách (khớp BE film-service).",
    )
    date: Optional[str] = Field(
        default=None,
        description="Legacy alias cho showtimeDate / ngày yyyy-MM-dd — vẫn dùng được cho search_showtimes_by_film.",
    )
    cinemaId: Optional[str] = Field(default=None, description="UUID rạp (body)")
    cinemaIds: Optional[list[str]] = None
    filmIds: Optional[list[str]] = None
    selectedIds: Optional[list[str]] = None
    pageRequest: Optional[PageRequestBody] = None

    @model_validator(mode="after")
    def _sync_showtime_date_fields(self) -> "SearchFilmsRequestBody":
        if self.showtimeDate is None and self.date is not None:
            self.showtimeDate = self.date
        if self.date is None and self.showtimeDate is not None:
            self.date = self.showtimeDate
        return self


def request_body_to_dict(
    body: SearchFilmsRequestBody | RequestBody | None,
    *,
    api_id: str | None = None,
) -> RequestBody | None:
    if body is None:
        return None
    if isinstance(body, SearchFilmsRequestBody):
        raw = body.model_dump(exclude_none=True, by_alias=True)
        return _sanitize_request_body_for_api(api_id, raw)
    if isinstance(body, dict):
        return _sanitize_request_body_for_api(api_id, body)
    return clamp_request_body_sizes(body)


class ApiCallPlan(BaseModel):
    """Kế hoạch gọi một API (api_id từ router + body từ call agent)."""

    model_config = ConfigDict(extra="forbid")

    api_id: str
    request_body: Optional[SearchFilmsRequestBody] = Field(
        default=None,
        description="Body POST (search_films và các API POST tương lai).",
    )


class ApiRouterDecision(BaseModel):
    """Agent chọn API — chỉ nhận danh sách mô tả chức năng ngắn."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["call_api", "finish"]
    api_id: Optional[str] = Field(
        default=None,
        description="api_id từ danh sách khi action=call_api.",
    )
    reason: str = Field(description="Lý do chọn API hoặc finish.")


class ApiCallBodyDecision(BaseModel):
    """Agent điền body/params — nhận mô tả đầy đủ của một API."""

    model_config = ConfigDict(extra="forbid")

    request_body: Optional[SearchFilmsRequestBody] = Field(
        default=None,
        description="Body JSON đầy đủ theo spec API đã chọn.",
    )
    path_params: Optional[dict[str, str]] = Field(
        default=None,
        description="Path params (filmId, cinemaId) khi API có {filmId}/{cinemaId} trong path.",
    )
    reason: str = Field(description="Lý do chọn request_body này.")


class AgentDecision(BaseModel):
    """Legacy — giữ tương thích schema cũ."""

    model_config = ConfigDict(extra="forbid")

    action: Literal["call_api", "finish"]
    api_calls: list[ApiCallPlan] = Field(default_factory=list)
    reason: str = Field(description="Lý do chọn hành động này.")
    missing_info: Optional[str] = None


class AnswerLlmResponse(BaseModel):
    answer: str
    confidence: Literal["high", "medium", "low"] = "medium"


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    history: list[ChatHistoryMessage] = Field(
        default_factory=list,
        max_length=10,
        description="Tối đa 10 tin nhắn trước (user/assistant) làm ngữ cảnh hội thoại.",
    )
    access_token: Optional[str] = Field(
        default=None,
        description="JWT accessToken — chatbot ghép Cookie gọi /users/me.",
    )
    refresh_token: Optional[str] = Field(
        default=None,
        description="JWT refreshToken (tùy chọn).",
    )
    auth_cookie: Optional[str] = Field(
        default=None,
        description="Legacy: accessToken=...; refreshToken=...",
    )


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
    user_role: Optional[str] = Field(
        default=None,
        description="Vai trò từ GET /users/me (CUSTOMER nếu chưa đăng nhập).",
    )
