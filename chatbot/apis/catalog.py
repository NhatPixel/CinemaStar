from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

UserRole = str  # ADMIN | MANAGER | STAFF | CUSTOMER

ALL_USER_ROLES: tuple[UserRole, ...] = ("CUSTOMER", "STAFF", "MANAGER", "ADMIN")

# Số dòng tối đa mỗi lần load danh sách (pagination).
MAX_API_LIST_SIZE = 10

InputLocation = Literal["path", "query", "body"]


@dataclass(frozen=True)
class ApiInputSpec:
    """Mô tả một tham số đầu vào của API."""

    name: str
    location: InputLocation
    description: str
    required: bool = True
    example: str = ""


@dataclass(frozen=True)
class ApiDefinition:
    api_id: str
    method: str
    path: str
    description: str
    allowed_roles: tuple[UserRole, ...]
    path_params: tuple[str, ...]
    query_params: tuple[str, ...]
    sample_request: dict[str, Any]
    sample_response: dict[str, Any]
    inputs: tuple[ApiInputSpec, ...] = ()
    use_cases: str = ""
    """Mô tả ngắn chức năng — chỉ dùng cho agent chọn API (router)."""
    purpose: str = ""


# --- Tham chiếu enum & field cho search_films (đưa vào LLM prompt) ---

_FILM_STATUS_VALUES = (
    "NOW_SHOWING — đang chiếu (khách hỏi: 'phim đang chiếu', 'xem gì', 'hot')",
    "COMING_SOON — sắp chiếu (khách hỏi: 'phim sắp chiếu', 'sắp ra mắt')",
    "ENDED — ngừng/hết chiếu (khách hỏi: 'phim đã hết', 'ngừng chiếu')",
    "ARCHIVED — lưu trữ (chủ yếu admin, ít dùng với khách)",
)

_AGE_RATING_VALUES = (
    "RATING_1 — T0, mọi lứa tuổi (0+)",
    "RATING_2 — T6, cần phụ huynh (6+)",
    "RATING_3 — T13, từ 13 tuổi",
    "RATING_4 — T16, từ 16 tuổi",
    "RATING_5 — T18, từ 18 tuổi (cấm trẻ em)",
)

_FILTER_OPERATORS = (
    "EQ — bằng (enum, số, ngày, chuỗi chính xác)",
    "NEQ — khác",
    "LIKE — chứa chuỗi (chỉ field String: TITLE, DIRECTOR, ACTOR, TYPE, COUNTRY, LANGUAGE)",
    "IN — thuộc danh sách (value là mảng, vd STATUS IN [NOW_SHOWING, COMING_SOON])",
    "GTE / LTE — lớn hơn / nhỏ hơn (DURATION, RELEASE_DATE)",
    "BETWEEN — khoảng (RELEASE_DATE: value [from, to] hoặc dùng dateRange ở body)",
)

_FILM_FIELDS = (
    ("TITLE", "string", "Tên phim", "LIKE | EQ | IN"),
    ("DIRECTOR", "string", "Đạo diễn", "LIKE | EQ | IN"),
    ("ACTOR", "string", "Diễn viên (text, có thể nhiều người)", "LIKE | EQ | IN"),
    ("TYPE", "string", "Thể loại/mô tả ngắn (text tự do, vd 'Hành động', 'Kinh dị') — KHÔNG phải enum", "LIKE | EQ | IN"),
    ("COUNTRY", "string", "Quốc gia sản xuất", "LIKE | EQ | IN"),
    ("LANGUAGE", "string", "Ngôn ngữ phim", "LIKE | EQ | IN"),
    ("STATUS", "enum FilmStatus", "Trạng thái chiếu — xem bảng STATUS bên dưới", "EQ | IN | NEQ"),
    ("AGE_RATING", "enum AgeRating", "Giới hạn tuổi — xem bảng AGE_RATING bên dưới", "EQ | IN | NEQ"),
    ("RELEASE_DATE", "date (yyyy-MM-dd)", "Ngày khởi chiếu", "EQ | GTE | LTE | BETWEEN"),
    ("DURATION", "integer (phút)", "Thời lượng phim", "EQ | GTE | LTE | IN | BETWEEN"),
    ("ID", "UUID", "Mã phim (chỉ khi đã có từ kết quả search trước)", "EQ | IN"),
    ("TIME_CREATED", "datetime", "Ngày tạo bản ghi", "EQ | GTE | LTE | BETWEEN"),
    ("TIME_UPDATED", "datetime", "Ngày cập nhật", "EQ | GTE | LTE | BETWEEN"),
)

_SORT_DIRECTIONS = ("ASC — tăng dần", "DESC — giảm dần")


def _format_film_search_reference() -> str:
    status_lines = "\n".join(f"    • {v}" for v in _FILM_STATUS_VALUES)
    age_lines = "\n".join(f"    • {v}" for v in _AGE_RATING_VALUES)
    op_lines = "\n".join(f"    • {v}" for v in _FILTER_OPERATORS)
    field_lines = "\n".join(
        f"    • {name} ({dtype}): {desc}. operator: {ops}"
        for name, dtype, desc, ops in _FILM_FIELDS
    )
    sort_dir = "\n".join(f"    • {d}" for d in _SORT_DIRECTIONS)
    return f"""=== BẢNG ENUM & FIELD search_films ===

STATUS (filterBy field='STATUS', value PHẢI là một trong các mã sau):
{status_lines}

AGE_RATING (filterBy field='AGE_RATING'):
{age_lines}

operator (filterBy.operator):
{op_lines}

Các field filterBy / sortBy.field:
{field_lines}

sortBy.direction:
{sort_dir}

Ánh xạ câu hỏi tiếng Việt → filterBy:
    • "phim đang chiếu" → {{field:"STATUS", operator:"EQ", value:"NOW_SHOWING"}}
    • "phim sắp chiếu" → {{field:"STATUS", operator:"EQ", value:"COMING_SOON"}}
    • "phim 18+" / "người lớn" → {{field:"AGE_RATING", operator:"EQ", value:"RATING_5"}}
    • "phim cho trẻ em" / "P" → {{field:"AGE_RATING", operator:"IN", value:["RATING_1","RATING_2"]}}
    • "phim hành động" → keyword="hành động" hoặc {{field:"TYPE", operator:"LIKE", value:"hành động"}}
    • "phim Việt Nam" → {{field:"COUNTRY", operator:"LIKE", value:"Việt Nam"}}
"""


_IN_SEARCH_FILMS = (
    ApiInputSpec(
        "size",
        "body",
        f"Số bản ghi tối đa mỗi trang (1–{MAX_API_LIST_SIZE}, mặc định {MAX_API_LIST_SIZE}).",
        False,
        str(MAX_API_LIST_SIZE),
    ),
    ApiInputSpec(
        "cursor",
        "body",
        "Con trỏ phân trang; dùng nextCursor từ response trước. Bỏ qua hoặc null ở lần gọi đầu.",
        False,
        "",
    ),
    ApiInputSpec(
        "keyword",
        "body",
        "Từ khóa tìm kiếm tự do (tùy chọn, tối đa 255 ký tự). "
        "Backend tìm LIKE trên: TITLE, DIRECTOR, ACTOR, TYPE, COUNTRY, LANGUAGE. "
        "★ Cách đơn giản nhất khi khách nhắc tên phim/diễn viên/đạo diễn — điền keyword='Venom' "
        "(có thể kết hợp filterBy STATUS). Không cần film_id.",
        False,
        "Venom",
    ),
    ApiInputSpec(
        "filterBy",
        "body",
        "Mảng bộ lọc. Mỗi phần tử: {field, operator, value}. "
        "Xem bảng ENUM & FIELD bên dưới để biết field hợp lệ, operator và value enum. "
        "STATUS value: NOW_SHOWING | COMING_SOON | ENDED | ARCHIVED. "
        "AGE_RATING value: RATING_1..RATING_5. "
        "TYPE là text tự do (thể loại), không phải enum.",
        False,
        '[{"field":"STATUS","operator":"EQ","value":"NOW_SHOWING"}]',
    ),
    ApiInputSpec(
        "sortBy",
        "body",
        "Mảng sắp xếp: {field, direction}. "
        "field: TIME_CREATED | RELEASE_DATE | TITLE | STATUS | DURATION | ... (xem bảng FIELD). "
        "direction: ASC | DESC. Mặc định backend: RELEASE_DATE DESC nếu bỏ qua sortBy.",
        False,
        '[{"field":"TIME_CREATED","direction":"ASC"}]',
    ),
    ApiInputSpec(
        "dateRange",
        "body",
        "Lọc theo ngày khởi chiếu (tùy chọn). Object {from, to} — ISO datetime, vd: "
        '{"from":"2026-01-01T00:00:00","to":"2026-12-31T23:59:59"}. '
        "Backend tự thêm filter RELEASE_DATE BETWEEN.",
        False,
        '{"from":"2026-01-01T00:00:00","to":"2026-12-31T23:59:59"}',
    ),
    ApiInputSpec(
        "showtimeDate",
        "body",
        "Lọc phim có suất chiếu trong ngày (yyyy-MM-dd, tùy chọn). Dùng khi khách hỏi phim chiếu hôm nay/ngày X.",
        False,
        "2026-05-31",
    ),
)

_IN_SEARCH_FILMS_CUSTOMER_EXTRA = (
    ApiInputSpec(
        "cinemaId",
        "body",
        "UUID rạp (tùy chọn) — chỉ phim có suất tại rạp đó. Lấy từ search_cinemas/search_my_managed_cinemas.",
        False,
        "",
    ),
)

_BOOKING_SEARCH_FIELDS = (
    "CINEMA_ID, SHOWTIME_ID, FILM_TITLE, SHOWTIME_START_DATE_TIME, USER_ID (operator). "
    "keyword tìm theo mã/tên. "
    "★ me/active, me/history, cinemas/me/purchased|unpaid: KHÔNG gửi BOOKING_STATUS / PAYMENT_STATUS — BE tự lọc."
)

_STAFF_ROLES: tuple[UserRole, ...] = ("ADMIN", "MANAGER", "STAFF")
_OPERATOR_ROLES: tuple[UserRole, ...] = ("ADMIN", "MANAGER", "STAFF")
_MANAGER_STAFF: tuple[UserRole, ...] = ("MANAGER", "STAFF")
_ADMIN_ROLES: tuple[UserRole, ...] = ("ADMIN",)
_MANAGER_ROLES: tuple[UserRole, ...] = ("MANAGER",)
_CUSTOMER_ROLES: tuple[UserRole, ...] = ("CUSTOMER",)

_PAGE_RESPONSE_SAMPLE: dict[str, Any] = {
    "data": [],
    "currentPage": 1,
    "totalPages": 0,
    "totalElements": 0,
    "size": MAX_API_LIST_SIZE,
    "hasNext": False,
    "hasPrevious": False,
}

_CURSOR_RESPONSE_SAMPLE: dict[str, Any] = {
    "data": [],
    "hasNext": False,
    "nextCursor": None,
}


def _page_inputs() -> tuple[ApiInputSpec, ...]:
    return (
        ApiInputSpec(
            "page",
            "body",
            "Số trang (≥1, mặc định 1).",
            False,
            "1",
        ),
        ApiInputSpec(
            "size",
            "body",
            f"Số bản ghi mỗi trang (1–{MAX_API_LIST_SIZE}, mặc định {MAX_API_LIST_SIZE}).",
            False,
            str(MAX_API_LIST_SIZE),
        ),
        ApiInputSpec(
            "keyword",
            "body",
            "Từ khóa tìm kiếm tự do (tùy chọn, ≤255 ký tự).",
            False,
            "",
        ),
        ApiInputSpec(
            "filterBy",
            "body",
            "Mảng bộ lọc: {field, operator, value}. operator: EQ | NEQ | LIKE | IN | GTE | LTE | BETWEEN.",
            False,
            "[]",
        ),
        ApiInputSpec(
            "sortBy",
            "body",
            "Mảng sắp xếp: {field, direction}. direction: ASC | DESC.",
            False,
            "[]",
        ),
    )


def _report_inputs(fields_hint: str) -> tuple[ApiInputSpec, ...]:
    return (
        ApiInputSpec(
            "dateRange",
            "body",
            "Khoảng thời gian báo cáo {from, to} — ISO datetime.",
            False,
            '{"from":"2026-01-01T00:00:00","to":"2026-01-31T23:59:59"}',
        ),
        ApiInputSpec(
            "cinemaIds",
            "body",
            "Danh sách UUID rạp cần lọc (mảng, có thể rỗng = tất cả trong phạm vi quyền).",
            False,
            "[]",
        ),
        ApiInputSpec(
            "filmIds",
            "body",
            "Danh sách UUID phim cần lọc (mảng, tùy chọn).",
            False,
            "[]",
        ),
        ApiInputSpec(
            "selectedIds",
            "body",
            "UUID đã chọn để xuất/lọc (chỉ một số API doanh thu).",
            False,
            "[]",
        ),
        ApiInputSpec(
            "pageRequest",
            "body",
            f"Phân trang báo cáo: {{page, size (≤{MAX_API_LIST_SIZE}), keyword, filterBy, sortBy}}. "
            f"filterBy.field: {fields_hint}",
            True,
            f'{{"page":1,"size":{MAX_API_LIST_SIZE},"keyword":"","filterBy":[],"sortBy":[]}}',
        ),
    )


def _page_sample(
    *,
    keyword: str = "",
    filter_by: list[dict[str, Any]] | None = None,
    sort_by: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    return {
        "page": 1,
        "size": MAX_API_LIST_SIZE,
        "keyword": keyword,
        "filterBy": filter_by or [],
        "sortBy": sort_by or [],
    }


def _report_sample(fields_hint: str, *, with_selected_ids: bool = True) -> dict[str, Any]:
    sample = {
        "dateRange": {
            "from": "2026-01-01T00:00:00",
            "to": "2026-01-31T23:59:59",
        },
        "cinemaIds": [],
        "filmIds": [],
        "pageRequest": _page_sample(),
    }
    if with_selected_ids:
        sample["selectedIds"] = []
    return sample


_COMMON_BODY_FIELD_POOL = (
    "page",
    "size",
    "keyword",
    "cursor",
    "filterBy",
    "sortBy",
    "dateRange",
    "showtimeDate",
    "date",
    "cinemaId",
    "cinemaIds",
    "filmIds",
    "selectedIds",
    "pageRequest",
)

_API_CONTRACT_NOTES: dict[str, tuple[str, ...]] = {
    "search_cinemas": (
        "sortBy.field must use CREATED_AT for cinema search. Do not send TIME_CREATED.",
        "Use filterBy STATUS=ACTIVE when you want active cinemas only.",
    ),
    "search_my_managed_cinemas": (
        "sortBy.field must use CREATED_AT for manager/staff cinema search. Do not send TIME_CREATED.",
        "This API is scope-limited and is not for ADMIN or CUSTOMER.",
    ),
    "search_films": (
        "Prefer showtimeDate when the question asks for films with showtimes on a day.",
        "date is a legacy alias; do not mix dateRange with showtimeDate in the same request.",
    ),
    "search_films_customer": (
        "Prefer showtimeDate when the question asks for films with showtimes on a day.",
        "cinemaId is optional and should only be used when the cinema scope is already known.",
        "date is a legacy alias; do not mix dateRange with showtimeDate in the same request.",
    ),
    "search_showtimes_by_film": (
        "filmId must be a UUID in the path. Never pass a film title string into {filmId}.",
        "Body must contain date (required) and may contain cinemaId. Do not use showtimeDate here.",
        "If the user only gives a film title, resolve filmId first via a film search API.",
    ),
    "search_payment_revenues_cinemas": (
        "Use nested pageRequest for pagination and filters.",
        "selectedIds is allowed for revenue APIs that support selected rows.",
    ),
    "search_payment_revenues_cinemas_me": (
        "Use nested pageRequest for pagination and filters.",
        "selectedIds is allowed for revenue APIs that support selected rows.",
    ),
    "search_booking_revenues_cinemas": (
        "Use nested pageRequest for pagination and filters.",
        "selectedIds is allowed for revenue APIs that support selected rows.",
    ),
    "search_booking_revenues_cinemas_me": (
        "Use nested pageRequest for pagination and filters.",
        "selectedIds is allowed for revenue APIs that support selected rows.",
    ),
    "search_showtime_reports": (
        "Use nested pageRequest for pagination and filters.",
        "Do not send selectedIds to showtime report APIs.",
    ),
    "search_showtime_reports_me": (
        "Use nested pageRequest for pagination and filters.",
        "Do not send selectedIds to showtime report APIs.",
    ),
}

_API_BODY_FIELD_OVERRIDES: dict[str, tuple[str, ...]] = {
    "search_showtimes_by_film": ("page", "size", "date", "cinemaId"),
}


def _input_names_for_api(api: ApiDefinition, *, location: InputLocation | None = None) -> tuple[str, ...]:
    names: list[str] = []
    for spec in api.inputs:
        if location is not None and spec.location != location:
            continue
        names.append(spec.name)
    return tuple(names)


def _format_name_list(names: tuple[str, ...]) -> str:
    return ", ".join(names) if names else "(none)"


def _api_allowed_body_fields(api: ApiDefinition) -> tuple[str, ...]:
    override = _API_BODY_FIELD_OVERRIDES.get(api.api_id)
    if override is not None:
        return override
    allowed = set(_input_names_for_api(api, location="body"))
    if api.api_id in {"search_films", "search_films_customer"}:
        allowed.add("date")
    return tuple(field for field in _COMMON_BODY_FIELD_POOL if field in allowed)


def _api_forbidden_body_fields(api: ApiDefinition) -> tuple[str, ...]:
    allowed = set(_api_allowed_body_fields(api))
    return tuple(field for field in _COMMON_BODY_FIELD_POOL if field not in allowed)


def _api_contract_notes(api_id: str) -> tuple[str, ...]:
    return _API_CONTRACT_NOTES.get(api_id, ())


def format_api_contract_for_prompt(api_id: str, user_role: str | None = None) -> str:
    role = normalize_user_role(user_role)
    catalog = apis_for_role(role)
    api = catalog.get(api_id) or API_CATALOG.get(api_id)
    if api is None or not is_role_allowed(api, role):
        return ""

    path_params = _input_names_for_api(api, location="path")
    query_params = _input_names_for_api(api, location="query")
    body_fields = _api_allowed_body_fields(api)
    forbidden_fields = _api_forbidden_body_fields(api)
    notes = _api_contract_notes(api_id)

    parts = [
        "=== REQUEST CONTRACT ===",
        f"Allowed body fields: {_format_name_list(body_fields)}",
        f"Forbidden body fields: {_format_name_list(forbidden_fields)}",
        f"Path params: {_format_name_list(path_params)}",
        f"Query params: {_format_name_list(query_params)}",
    ]
    if notes:
        parts.append("Important notes:")
        parts.extend(f"- {note}" for note in notes)
    return "\n".join(parts)


def _make_page_search(
    api_id: str,
    path: str,
    *,
    allowed_roles: tuple[UserRole, ...],
    fields_hint: str,
    purpose: str,
    use_cases: str,
    description: str = "",
    path_params: tuple[str, ...] = (),
    path_inputs: tuple[ApiInputSpec, ...] = (),
    extra_inputs: tuple[ApiInputSpec, ...] = (),
    inputs_override: tuple[ApiInputSpec, ...] | None = None,
    sample_request: dict[str, Any] | None = None,
) -> ApiDefinition:
    desc = description or (
        f"POST tìm kiếm phân trang (page/size/keyword/filterBy/sortBy). "
        f"Các field filterBy/sortBy: {fields_hint}."
    )
    return ApiDefinition(
        api_id=api_id,
        method="POST",
        path=path,
        description=desc,
        allowed_roles=allowed_roles,
        path_params=path_params,
        query_params=(),
        sample_request=sample_request or {"default": _page_sample()},
        sample_response=_PAGE_RESPONSE_SAMPLE,
        inputs=inputs_override or (path_inputs + _page_inputs() + extra_inputs),
        use_cases=use_cases,
        purpose=purpose,
    )


def _make_cursor_search(
    api_id: str,
    path: str,
    *,
    allowed_roles: tuple[UserRole, ...],
    purpose: str,
    use_cases: str,
    description: str,
    inputs: tuple[ApiInputSpec, ...] | None = None,
    sample_request: dict[str, Any] | None = None,
) -> ApiDefinition:
    return ApiDefinition(
        api_id=api_id,
        method="POST",
        path=path,
        description=description,
        allowed_roles=allowed_roles,
        path_params=(),
        query_params=(),
        sample_request=sample_request or {"default": {"size": MAX_API_LIST_SIZE, "filterBy": [], "sortBy": []}},
        sample_response=_CURSOR_RESPONSE_SAMPLE,
        inputs=inputs or _IN_SEARCH_FILMS,
        use_cases=use_cases,
        purpose=purpose,
    )


def _make_report_search(
    api_id: str,
    path: str,
    *,
    allowed_roles: tuple[UserRole, ...],
    fields_hint: str,
    purpose: str,
    use_cases: str,
    with_selected_ids: bool = False,
) -> ApiDefinition:
    inputs = _report_inputs(fields_hint)
    if not with_selected_ids:
        inputs = tuple(spec for spec in inputs if spec.name != "selectedIds")
    return ApiDefinition(
        api_id=api_id,
        method="POST",
        path=path,
        description=(
            f"POST báo cáo có phân trang (dateRange, cinemaIds, filmIds, pageRequest). "
            f"pageRequest.filterBy.field: {fields_hint}."
        ),
        allowed_roles=allowed_roles,
        path_params=(),
        query_params=(),
        sample_request={"default": _report_sample(fields_hint, with_selected_ids=with_selected_ids)},
        sample_response={"rows": [], "summary": {}, "page": _PAGE_RESPONSE_SAMPLE},
        inputs=inputs,
        use_cases=use_cases,
        purpose=purpose,
    )


API_CATALOG: dict[str, ApiDefinition] = {
    "search_films": ApiDefinition(
        api_id="search_films",
        method="POST",
        path="/films/search",
        description=(
            "Tìm kiếm / lọc danh sách phim (POST cursor pagination). "
            "Body gồm: size, cursor, keyword, filterBy, sortBy, dateRange. "
            "★ Tìm theo tên phim/diễn viên/đạo diễn: dùng keyword (vd: 'Venom') hoặc filterBy TITLE LIKE — KHÔNG cần film_id. "
            "★ Phim đang chiếu / sắp chiếu: filterBy STATUS=NOW_SHOWING|COMING_SOON. "
            "★ Phim có suất ngày X: showtimeDate='yyyy-MM-dd'. "
            "Response trả danh sách phim (title, genre, status, description, ...) để trả lời khách."
        ),
        allowed_roles=ALL_USER_ROLES,
        path_params=(),
        query_params=(),
        sample_request={
            "body_by_keyword": {
                "size": MAX_API_LIST_SIZE,
                "keyword": "Venom",
                "filterBy": [],
                "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
            },
            "body_by_title_filter": {
                "size": MAX_API_LIST_SIZE,
                "keyword": "",
                "filterBy": [{"field": "TITLE", "operator": "LIKE", "value": "Venom"}],
                "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
            },
            "body_now_showing": {
                "size": MAX_API_LIST_SIZE,
                "keyword": "",
                "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "NOW_SHOWING"}],
                "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
            },
        },
        sample_response={
            "data": [
                {
                    "id": "film_001",
                    "title": "Avengers: Endgame",
                    "director": "Anthony Russo",
                    "actor": "Robert Downey Jr.",
                    "type": "Hành động",
                    "releaseDate": "2026-01-15",
                    "duration": 181,
                    "country": "Mỹ",
                    "language": "Tiếng Anh",
                    "ageRating": "RATING_4",
                    "status": "NOW_SHOWING",
                    "description": "Cuộc chiến cuối cùng của các anh hùng.",
                }
            ],
            "hasNext": False,
            "nextCursor": None,
        },
        inputs=_IN_SEARCH_FILMS,
        use_cases=(
            "• Khách nhắc TÊN phim/diễn viên/đạo diễn → keyword='Venom' hoặc filterBy TITLE LIKE "
            "(tự trích từ câu hỏi, KHÔNG hỏi khách mã phim).\n"
            "• Khách hỏi phim đang chiếu / sắp chiếu → filterBy STATUS.\n"
            "• Khách hỏi phim trong khoảng thời gian → dateRange {from, to}.\n"
            "• Khách hỏi chung về phim → filterBy STATUS=NOW_SHOWING hoặc keyword rỗng + filterBy."
        ),
        purpose=(
            "Tìm kiếm phim công khai (không bắt buộc đăng nhập). "
            "ADMIN/MANAGER/STAFF: tra cứu toàn bộ catalog (kể cả ENDED/ARCHIVED). "
            "CUSTOMER chưa đăng nhập: dùng API này. CUSTOMER đã đăng nhập → ưu tiên search_films_customer."
        ),
    ),
    "search_films_customer": ApiDefinition(
        api_id="search_films_customer",
        method="POST",
        path="/films/customer/search",
        description=(
            "Tìm phim theo phạm vi khách/rạp (cursor pagination). Body giống search_films "
            "+ cinemaId, showtimeDate tùy chọn. BE lọc phim đang/sắp chiếu có suất; "
            "CUSTOMER toàn hệ thống, STAFF/MANAGER theo rạp được phân quyền."
        ),
        allowed_roles=ALL_USER_ROLES,
        path_params=(),
        query_params=(),
        sample_request={
            "by_cinema_date": {
                "size": MAX_API_LIST_SIZE,
                "cinemaId": "uuid-rạp",
                "showtimeDate": "2026-05-31",
                "filterBy": [{"field": "STATUS", "operator": "EQ", "value": "NOW_SHOWING"}],
                "sortBy": [{"field": "TIME_CREATED", "direction": "ASC"}],
            },
        },
        sample_response=_CURSOR_RESPONSE_SAMPLE,
        inputs=_IN_SEARCH_FILMS + _IN_SEARCH_FILMS_CUSTOMER_EXTRA,
        use_cases=(
            "• Khách hỏi phim, gợi ý xem → keyword hoặc filterBy STATUS=NOW_SHOWING.\n"
            "• Phim chiếu tại rạp/ngày cụ thể → cinemaId + showtimeDate.\n"
            "• Khách hỏi suất chiếu theo rạp → search_films_customer lấy các phim đang chiếu rồi bot gọi tiếp search_showtimes_by_film cho từng phim.\n"
            "• CUSTOMER ưu tiên API này thay search_films khi đã đăng nhập."
        ),
        purpose=(
            "Tìm phim theo phạm vi khách (bắt buộc đăng nhập). "
            "CUSTOMER: phim đang/sắp chiếu; MANAGER/STAFF: theo rạp được phân quyền; ADMIN: toàn hệ thống."
        ),
    ),
    "search_cinemas": _make_page_search(
        "search_cinemas",
        "/cinemas/search",
        allowed_roles=ALL_USER_ROLES,
        fields_hint="ID, CODE, NAME, ADDRESS, PHONE, STATUS (ACTIVE|INACTIVE|MAINTENANCE), MANAGER_ID",
        purpose=(
            "Tìm rạp chiếu phim (công khai hoặc scope theo role). "
            "CUSTOMER/khách chưa đăng nhập: chỉ rạp ACTIVE. "
            "ADMIN: toàn bộ. MANAGER/STAFF: rạp trong phạm vi quản lý."
        ),
        use_cases=(
            "• Khách hỏi rạp gần đây, danh sách rạp → keyword hoặc filterBy STATUS=ACTIVE.\n"
            "• Admin tra cứu mọi trạng thái rạp.\n"
            "• Lấy cinemaId cho search_films_customer / search_showtimes_by_film / search_products_by_cinema."
        ),
        inputs_override=(
            ApiInputSpec(
                "filmId",
                "path",
                "UUID phim â€” láº¥y tá»« káº¿t quáº£ search_films/search_films_customer, KHÃ”NG há»i khÃ¡ch.",
                True,
                "",
            ),
            ApiInputSpec(
                "page",
                "body",
                "Sá»‘ trang (â‰¥1, máº·c Ä‘á»‹nh 1).",
                False,
                "1",
            ),
            ApiInputSpec(
                "size",
                "body",
                f"Sá»‘ báº£n ghi má»—i trang (1â€“{MAX_API_LIST_SIZE}, máº·c Ä‘á»‹nh {MAX_API_LIST_SIZE}).",
                False,
                str(MAX_API_LIST_SIZE),
            ),
            ApiInputSpec(
                "date",
                "body",
                "NgÃ y chiáº¿u báº¯t buá»™c (yyyy-MM-dd).",
                True,
                "2026-05-31",
            ),
            ApiInputSpec(
                "cinemaId",
                "body",
                "UUID ráº¡p (tÃ¹y chá»n) â€” lá»c suáº¥t táº¡i ráº¡p Ä‘Ã³.",
                False,
                "",
            ),
        ),
        sample_request={
            "active": _page_sample(
                filter_by=[{"field": "STATUS", "operator": "EQ", "value": "ACTIVE"}],
                sort_by=[{"field": "CREATED_AT", "direction": "ASC"}],
            )
        },
    ),
    "search_my_managed_cinemas": _make_page_search(
        "search_my_managed_cinemas",
        "/cinemas/me/search",
        allowed_roles=_MANAGER_STAFF,
        fields_hint="ID, CODE, NAME, ADDRESS, PHONE, STATUS (ACTIVE|INACTIVE|MAINTENANCE)",
        purpose="Tìm rạp ACTIVE do MANAGER/STAFF được phân quyền (không dùng cho ADMIN/CUSTOMER).",
        use_cases=(
            "• Manager/Staff xem rạp mình phụ trách → keyword hoặc filterBy STATUS.\n"
            "• Dùng cinemaId từ đây cho search_films_customer / search_showtimes_by_film."
        ),
        sample_request={
            "managed_active": _page_sample(
                filter_by=[{"field": "STATUS", "operator": "EQ", "value": "ACTIVE"}],
                sort_by=[{"field": "CREATED_AT", "direction": "ASC"}],
            )
        },
    ),
    "search_halls": _make_page_search(
        "search_halls",
        "/halls/search",
        allowed_roles=_STAFF_ROLES,
        fields_hint="ID, CINEMA_ID, NAME, STATUS (ACTIVE|MAINTENANCE)",
        purpose="Tìm phòng chiếu (ADMIN/MANAGER/STAFF; BE scope theo rạp quản lý).",
        use_cases=(
            "• Quản lý phòng chiếu theo rạp → filterBy CINEMA_ID EQ.\n"
            "• Tìm phòng theo tên → keyword hoặc filterBy NAME LIKE."
        ),
    ),
    "search_showtimes": _make_page_search(
        "search_showtimes",
        "/showtimes/search",
        allowed_roles=_STAFF_ROLES,
        fields_hint=(
            "ID, START_DATE_TIME, END_DATE_TIME, HALL_ID, FILM_ID, PRICING_POLICY_ID, "
            "STATUS (SCHEDULED|ONGOING|FINISHED|CANCELLED)"
        ),
        purpose="Tìm suất chiếu nội bộ (ADMIN/MANAGER/STAFF — CUSTOMER không được gọi).",
        use_cases=(
            "• Operator hỏi suất hôm nay / tuần này → filterBy START_DATE_TIME GTE/LTE hoặc BETWEEN.\n"
            "• Suất của một phim → filterBy FILM_ID EQ (UUID từ search_films).\n"
            "• CUSTOMER hỏi suất để đặt vé → dùng search_cinemas để lấy cinemaId rồi search_films_customer; nếu đã có filmId thì mới dùng search_showtimes_by_film.\n"
            "• KHÔNG yêu cầu khách biết filmId để gọi API này."
        ),
    ),
    "search_showtimes_by_film": _make_page_search(
        "search_showtimes_by_film",
        "/showtimes/films/{filmId}/search",
        allowed_roles=ALL_USER_ROLES,
        fields_hint="(path filmId) + body: date (bắt buộc yyyy-MM-dd), cinemaId tùy chọn",
        description=(
            "POST tra cứu suất chiếu của một phim theo filmId trong path. "
            "Body hợp lệ chỉ gồm page, size, date (bắt buộc yyyy-MM-dd) và cinemaId tùy chọn. "
            "Không dùng keyword, filterBy, sortBy hay showtimeDate cho API này."
        ),
        purpose="Tìm suất chiếu công khai của MỘT phim trong ngày (đặt vé) — cần filmId và date.",
        use_cases=(
            "• CUSTOMER/ADMIN/MANAGER/STAFF/chọn phim + ngày xem → path filmId từ search_films/search_films_customer, body date.\n"
            "• Lọc suất tại một rạp → thêm cinemaId (UUID từ search_cinemas).\n"
            "• Nếu khách chỉ nêu rạp mà không nêu phim, bot phải resolve danh sách phim trước rồi mới gọi API này cho từng filmId.\n"
            "• Không cần đăng nhập."
        ),
        path_params=("filmId",),
        path_inputs=(
            ApiInputSpec(
                "filmId",
                "path",
                "UUID phim — lấy từ kết quả search_films/search_films_customer, KHÔNG hỏi khách.",
                True,
                "",
            ),
        ),
        extra_inputs=(
            ApiInputSpec(
                "date",
                "body",
                "Ngày chiếu bắt buộc (yyyy-MM-dd).",
                True,
                "2026-05-31",
            ),
            ApiInputSpec(
                "cinemaId",
                "body",
                "UUID rạp (tùy chọn) — lọc suất tại rạp đó.",
                False,
                "",
            ),
        ),
        sample_request={
            "today": {
                "page": 1,
                "size": MAX_API_LIST_SIZE,
                "date": "2026-05-31",
            }
        },
    ),
    "search_pricing_policies": _make_page_search(
        "search_pricing_policies",
        "/showtimes/pricing-policies/search",
        allowed_roles=_STAFF_ROLES,
        fields_hint="ID, NAME, CINEMA_ID, TIME_CREATED, TIME_UPDATED",
        purpose="Tìm chính sách giá vé theo rạp/tên (quản lý suất chiếu).",
        use_cases="• Tra cứu bảng giá theo rạp → filterBy CINEMA_ID EQ.",
    ),
    "search_staffs": _make_page_search(
        "search_staffs",
        "/users/staffs/search",
        allowed_roles=("ADMIN", "MANAGER"),
        fields_hint="(PageRequest chung — keyword tìm theo tên/email nhân viên)",
        purpose="Tìm danh sách nhân viên (ADMIN/MANAGER).",
        use_cases="• Quản lý nhân sự, tìm staff theo keyword.",
    ),
    "search_customers": _make_page_search(
        "search_customers",
        "/users/customers/search",
        allowed_roles=_STAFF_ROLES,
        fields_hint="(PageRequest chung — keyword tìm khách hàng)",
        purpose="Tìm danh sách khách hàng (ADMIN/MANAGER/STAFF).",
        use_cases="• Tra cứu khách theo tên, email, SĐT qua keyword.",
    ),
    "search_managers": _make_page_search(
        "search_managers",
        "/users/managers/search",
        allowed_roles=_ADMIN_ROLES,
        fields_hint="(PageRequest chung — keyword tìm manager)",
        purpose="Tìm danh sách quản lý rạp (chỉ ADMIN).",
        use_cases="• Admin tìm manager theo keyword.",
    ),
    "search_promotions": _make_page_search(
        "search_promotions",
        "/promotions/search",
        allowed_roles=_STAFF_ROLES,
        fields_hint="CODE, NAME, STATUS (ACTIVE|INACTIVE), DISCOUNT_TYPE, START_AT, END_AT",
        purpose="Tìm mã khuyến mãi (ADMIN/MANAGER/STAFF — CUSTOMER không được gọi).",
        use_cases=(
            "• Tìm mã KM theo tên/mã → keyword hoặc filterBy CODE LIKE.\n"
            "• KM đang chạy → filterBy STATUS=ACTIVE."
        ),
    ),
    "search_my_active_bookings": _make_page_search(
        "search_my_active_bookings",
        "/bookings/me/active/search",
        allowed_roles=_CUSTOMER_ROLES,
        fields_hint=_BOOKING_SEARCH_FIELDS,
        purpose="Đơn đặt vé đang xử lý của khách (PENDING/RESERVED, chưa thanh toán xong, còn hạn giữ ghế).",
        use_cases=(
            "• Khách hỏi vé đang giữ, chưa thanh toán, đơn đang chờ → API này.\n"
            "• Body: page, size, keyword — KHÔNG filter BOOKING_STATUS/PAYMENT_STATUS."
        ),
    ),
    "search_my_booking_history": _make_page_search(
        "search_my_booking_history",
        "/bookings/me/history/search",
        allowed_roles=_CUSTOMER_ROLES,
        fields_hint=_BOOKING_SEARCH_FIELDS,
        purpose="Lịch sử đơn đã thanh toán thành công (CONFIRMED + PAID) của khách.",
        use_cases=(
            "• Khách hỏi vé đã mua, lịch sử đặt vé, vé đã thanh toán → API này.\n"
            "• Body: page, size, keyword — KHÔNG filter BOOKING_STATUS/PAYMENT_STATUS."
        ),
    ),
    "search_operator_bookings": _make_page_search(
        "search_operator_bookings",
        "/bookings/cinemas/me/search",
        allowed_roles=_OPERATOR_ROLES,
        fields_hint=_BOOKING_SEARCH_FIELDS,
        purpose="Tìm mọi đơn đặt vé tại rạp do nhân viên/quản lý phụ trách (tổng quát).",
        use_cases="• Staff/Manager tra cứu booking theo keyword, rạp, suất, tên phim.",
    ),
    "search_operator_purchased_bookings": _make_page_search(
        "search_operator_purchased_bookings",
        "/bookings/cinemas/me/purchased/search",
        allowed_roles=_OPERATOR_ROLES,
        fields_hint=_BOOKING_SEARCH_FIELDS,
        purpose="Đơn đã thanh toán tại rạp operator (BE tự lọc CONFIRMED+PAID).",
        use_cases=(
            "• Staff/Manager xem vé đã bán / đã thanh toán.\n"
            "• Có thể lọc cinemaId, filmTitle, showDate qua filterBy — không gửi BOOKING_STATUS."
        ),
    ),
    "search_operator_unpaid_bookings": _make_page_search(
        "search_operator_unpaid_bookings",
        "/bookings/cinemas/me/unpaid/search",
        allowed_roles=_OPERATOR_ROLES,
        fields_hint=_BOOKING_SEARCH_FIELDS,
        purpose="Đơn chưa thanh toán / đang giữ tại rạp operator (BE tự lọc trạng thái unpaid).",
        use_cases=(
            "• Staff/Manager xem đơn chờ thanh toán, giữ ghế.\n"
            "• Body giống purchased — không gửi BOOKING_STATUS/PAYMENT_STATUS."
        ),
    ),
    "search_my_payment_sessions": _make_page_search(
        "search_my_payment_sessions",
        "/payments/me/sessions/search",
        allowed_roles=ALL_USER_ROLES,
        fields_hint="BOOKING_ID, CINEMA_ID, STATUS (trạng thái giao dịch), TIME_CREATED",
        purpose="Tìm phiên thanh toán của tài khoản đang đăng nhập (mọi role, bắt buộc auth).",
        use_cases="• Khách hỏi trạng thái thanh toán, giao dịch gần đây (cần đăng nhập).",
    ),
    "search_payment_revenues_cinemas": _make_report_search(
        "search_payment_revenues_cinemas",
        "/payments/revenues/cinemas/search",
        allowed_roles=_ADMIN_ROLES,
        fields_hint="CinemaRevenueField (doanh thu thanh toán theo rạp/phim)",
        purpose="Báo cáo doanh thu thanh toán toàn hệ thống (ADMIN).",
        use_cases="• Admin xem doanh thu rạp theo khoảng ngày.",
        with_selected_ids=True,
    ),
    "search_payment_revenues_cinemas_me": _make_report_search(
        "search_payment_revenues_cinemas_me",
        "/payments/revenues/cinemas/me/search",
        allowed_roles=_MANAGER_ROLES,
        fields_hint="CinemaRevenueField — phạm vi rạp manager quản lý",
        purpose="Báo cáo doanh thu thanh toán rạp của manager.",
        use_cases="• Manager xem doanh thu rạp mình quản lý.",
        with_selected_ids=True,
    ),
    "search_booking_revenues_cinemas": _make_report_search(
        "search_booking_revenues_cinemas",
        "/bookings/revenues/cinemas/search",
        allowed_roles=_ADMIN_ROLES,
        fields_hint="BookingRevenueField",
        purpose="Báo cáo doanh thu đặt vé toàn hệ thống (ADMIN).",
        use_cases="• Thống kê doanh thu booking theo rạp/phim.",
        with_selected_ids=True,
    ),
    "search_booking_revenues_cinemas_me": _make_report_search(
        "search_booking_revenues_cinemas_me",
        "/bookings/revenues/cinemas/me/search",
        allowed_roles=_MANAGER_ROLES,
        fields_hint="BookingRevenueField — rạp của manager",
        purpose="Báo cáo doanh thu đặt vé rạp do manager quản lý.",
        use_cases="• Manager xem doanh thu booking rạp mình.",
        with_selected_ids=True,
    ),
    "search_showtime_reports": _make_report_search(
        "search_showtime_reports",
        "/bookings/reports/showtimes/search",
        allowed_roles=_ADMIN_ROLES,
        fields_hint="ShowtimePerformanceField",
        purpose="Báo cáo hiệu suất suất chiếu toàn hệ thống (ADMIN).",
        use_cases="• Thống kê fill rate, doanh thu theo suất.",
    ),
    "search_showtime_reports_me": _make_report_search(
        "search_showtime_reports_me",
        "/bookings/reports/showtimes/me/search",
        allowed_roles=_MANAGER_ROLES,
        fields_hint="ShowtimePerformanceField — rạp manager",
        purpose="Báo cáo hiệu suất suất chiếu rạp manager.",
        use_cases="• Manager xem báo cáo suất chiếu rạp mình.",
    ),
    "search_operator_products": _make_page_search(
        "search_operator_products",
        "/bookings/products/me/search",
        allowed_roles=_OPERATOR_ROLES,
        fields_hint="ID, NAME, TYPE, PRICE, STATUS",
        purpose="Tìm sản phẩm bắp nước tại rạp do operator quản lý.",
        use_cases="• Staff/Manager tra cứu menu sản phẩm rạp.",
    ),
    "search_products_by_cinema": _make_page_search(
        "search_products_by_cinema",
        "/bookings/products/cinemas/{cinemaId}/search",
        allowed_roles=ALL_USER_ROLES,
        fields_hint="ID, NAME, TYPE, PRICE, STATUS",
        purpose="Tìm sản phẩm bắp nước tại một rạp (đặt kèm vé).",
        use_cases=(
            "• Khách đặt combo tại rạp → path cinemaId từ search_cinemas (công khai, không cần đăng nhập).\n"
            "• keyword tìm tên sản phẩm."
        ),
        path_params=("cinemaId",),
        path_inputs=(
            ApiInputSpec(
                "cinemaId",
                "path",
                "UUID rạp — từ search_cinemas, KHÔNG hỏi khách mã rạp.",
                True,
                "",
            ),
        ),
    ),
}

_QUERY_PARAM_API_NAMES: dict[str, dict[str, str]] = {}


def _clamp_page_fields(target: dict[str, Any]) -> None:
    if "size" in target:
        try:
            n = int(target["size"])
        except (TypeError, ValueError):
            n = MAX_API_LIST_SIZE
        target["size"] = max(1, min(n, MAX_API_LIST_SIZE))
    if "page" in target:
        try:
            page = int(target["page"])
        except (TypeError, ValueError):
            page = 1
        target["page"] = max(1, page)


def clamp_request_body_sizes(body: dict[str, Any] | None) -> dict[str, Any] | None:
    """Giới hạn size/page trong body POST — tối đa MAX_API_LIST_SIZE bản ghi."""
    if not isinstance(body, dict):
        return body
    out = dict(body)
    _clamp_page_fields(out)
    nested = out.get("pageRequest")
    if isinstance(nested, dict):
        nested = dict(nested)
        _clamp_page_fields(nested)
        out["pageRequest"] = nested
    return out


def normalize_user_role(role: str | None) -> str:
    """Chuẩn hóa role từ GET /users/me — chỉ ADMIN|MANAGER|STAFF|CUSTOMER."""
    value = (role or "CUSTOMER").strip().upper()
    if value.startswith("ROLE_"):
        value = value[5:]
    if value in {"USER", "PUBLIC", "ANONYMOUS"}:
        return "CUSTOMER"
    if value in ALL_USER_ROLES:
        return value
    return "CUSTOMER"


def is_role_allowed(api: ApiDefinition, user_role: str) -> bool:
    role = normalize_user_role(user_role)
    return role in api.allowed_roles


def apis_for_role(user_role: str) -> dict[str, ApiDefinition]:
    role = normalize_user_role(user_role)
    return {
        api_id: api
        for api_id, api in API_CATALOG.items()
        if is_role_allowed(api, role)
    }


def _format_inputs(inputs: tuple[ApiInputSpec, ...]) -> str:
    if not inputs:
        return "  inputs: (không có — không cần params/body)"
    lines = ["  inputs:"]
    for spec in inputs:
        req = "bắt buộc" if spec.required else "tùy chọn"
        example = f" | vd: {spec.example}" if spec.example else ""
        lines.append(
            f"    - [{spec.location}] {spec.name} ({req}): {spec.description}{example}"
        )
    return "\n".join(lines)


def format_router_catalog_for_prompt(user_role: str | None = None) -> str:
    """Danh sách API ngắn gọn (api_id + chức năng) cho agent chọn API."""
    role = normalize_user_role(user_role)
    catalog = apis_for_role(role)
    lines: list[str] = [
        f"Vai trò người dùng: {role} (ADMIN | MANAGER | STAFF | CUSTOMER)\n",
        "Chọn đúng một api_id phù hợp câu hỏi, hoặc finish nếu chỉ chào hỏi / không cần tra cứu.\n",
    ]
    for api_id, api in catalog.items():
        purpose = (api.purpose or api.description).strip()
        lines.append(
            f"- api_id: {api_id}\n"
            f"  method: {api.method} | path: {api.path}\n"
            f"  chức năng: {purpose}"
        )
    return "\n\n".join(lines)


def format_api_detail_for_prompt(api_id: str, user_role: str | None = None) -> str:
    """Mô tả đầy đủ MỘT API — cho agent quyết định request body / params."""
    role = normalize_user_role(user_role)
    catalog = apis_for_role(role)
    api = catalog.get(api_id) or API_CATALOG.get(api_id)
    if api is None:
        return f"API không tồn tại: {api_id}"

    if not is_role_allowed(api, role):
        return f"Vai trò {role} không được gọi API {api_id}"

    use_cases_block = f"\nKhi nào dùng:\n{api.use_cases}\n" if api.use_cases else ""
    contract_block = format_api_contract_for_prompt(api_id, role)
    contract_block = f"\n{contract_block}\n" if contract_block else ""
    detail = (
        f"Giới hạn load: tối đa {MAX_API_LIST_SIZE} bản ghi/lần (field size).\n\n"
        f"api_id: {api.api_id}\n"
        f"method: {api.method}\n"
        f"path: {api.path}\n"
        f"mô tả: {api.description}\n"
        f"{use_cases_block}"
        f"{_format_inputs(api.inputs)}\n"
        f"{contract_block}"
        f"sample_request: {api.sample_request}\n"
        f"sample_response: {api.sample_response}"
    )
    if api.path_params:
        path_lines = "\n".join(f"    - {name}" for name in api.path_params)
        detail += f"\n\npath_params (bắt buộc — lấy UUID từ API search trước, không hỏi khách):\n{path_lines}"
    if api_id in {"search_films", "search_films_customer"}:
        detail += f"\n\n{_format_film_search_reference()}"
        detail += (
            "\n\nBody bổ sung (FilmCursorPageRequest):\n"
            "    • showtimeDate (yyyy-MM-dd): lọc phim có suất trong ngày (ưu tiên; backend cũng chấp nhận date legacy)\n"
            "    • cinemaId (UUID): chỉ /films/customer/search — lọc theo rạp"
        )
    return detail


def format_catalog_for_prompt(user_role: str | None = None) -> str:
    """Alias — danh sách router (ngắn). Dùng format_api_detail_for_prompt cho từng API."""
    return format_router_catalog_for_prompt(user_role)


def input_description_for_param(name: str) -> str | None:
    """Mô tả input theo tên field (dùng cho ApiCallPlan schema)."""
    for api in API_CATALOG.values():
        for spec in api.inputs:
            if spec.name == name and spec.location in {"path", "query"}:
                return spec.description
    return None
