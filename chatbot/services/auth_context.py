from __future__ import annotations

from loguru import logger

from ..apis.catalog import normalize_user_role
from ..apis.client import CinemaApiError, get_json, normalize_cookie_header

USERS_ME_PATH = "/users/me"


class BackendApiResponseError(Exception):
    """Raised when CinemaStar backend returns an error; payload mirrors backend JSON."""

    def __init__(self, status_code: int, payload: object):
        self.status_code = status_code
        self.payload = payload
        super().__init__(str(payload))


def _cookie_from_parsed(parsed_cookies: dict[str, str] | None) -> str | None:
    if not parsed_cookies:
        return None
    pairs = [f"{name}={value}" for name, value in parsed_cookies.items() if name and value]
    if not pairs:
        return None
    return "; ".join(pairs)


def build_cookie_from_tokens(
    access_token: str | None,
    refresh_token: str | None = None,
) -> str | None:
    """Ghép Cookie header từ JWT do FE gửi (cross-origin không có HttpOnly cookie)."""
    access = (access_token or "").strip()
    if not access:
        return None
    parts = [f"accessToken={access}"]
    refresh = (refresh_token or "").strip()
    if refresh:
        parts.append(f"refreshToken={refresh}")
    return "; ".join(parts)


def resolve_auth_cookie(
    *,
    header_cookie: str | None = None,
    body_cookie: str | None = None,
    access_token: str | None = None,
    refresh_token: str | None = None,
    parsed_cookies: dict[str, str] | None = None,
) -> str | None:
    """Lấy cookie đăng nhập từ header/body JWT/tokens/cookies FastAPI."""
    from_tokens = build_cookie_from_tokens(access_token, refresh_token)
    if from_tokens:
        return from_tokens
    for value in (header_cookie, body_cookie, _cookie_from_parsed(parsed_cookies)):
        cookie = normalize_cookie_header(value)
        if cookie:
            return cookie
    return None


def _raise_backend_error(exc: CinemaApiError) -> None:
    payload = exc.payload
    if not isinstance(payload, dict):
        payload = {"success": False, "message": str(exc), "code": exc.status_code}
    raise BackendApiResponseError(exc.status_code, payload) from exc


def _role_from_users_me_payload(data: object) -> str | None:
    if not isinstance(data, dict):
        return None
    role = data.get("role") or data.get("userRole")
    if role is None:
        return None
    return normalize_user_role(str(role))


def resolve_user_role(auth_cookie: str | None) -> str:
    """Gọi GET /api/users/me với cookie accessToken+refreshToken để lấy role.

    Không có cookie → CUSTOMER (khách chưa đăng nhập).
    Có cookie → bắt buộc gọi /users/me (401/403 trả về FE xử lý refresh).
    """
    cookie = normalize_cookie_header(auth_cookie)
    if not cookie:
        return "CUSTOMER"

    has_access = "accesstoken=" in cookie.lower()
    logger.info(
        "Resolve role via GET %s (accessToken=%s)",
        USERS_ME_PATH,
        "yes" if has_access else "no",
    )

    try:
        data = get_json(USERS_ME_PATH, auth_cookie=cookie)
    except CinemaApiError as exc:
        logger.warning("GET %s failed: %s", USERS_ME_PATH, exc)
        _raise_backend_error(exc)

    role = _role_from_users_me_payload(data)
    if role:
        logger.info("Role from /users/me: %s", role)
        return role

    logger.warning("GET /users/me OK but missing role field — default CUSTOMER")
    return "CUSTOMER"
