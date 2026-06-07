from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from loguru import logger

from ..config import settings


class CinemaApiError(Exception):
    def __init__(self, message: str, status_code: int = 400, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


_COOKIE_ATTRS = frozenset(
    {"path", "domain", "expires", "max-age", "secure", "httponly", "samesite", "priority"}
)


def normalize_cookie_header(raw: str | None) -> str | None:
    """Chuẩn hóa Cookie header (bỏ Path/HttpOnly/... nếu lưu từ Set-Cookie)."""
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None

    pairs: list[str] = []
    for piece in value.split(";"):
        piece = piece.strip()
        if not piece or "=" not in piece:
            continue
        name = piece.split("=", 1)[0].strip().lower()
        if name in _COOKIE_ATTRS:
            continue
        pairs.append(piece)

    if pairs:
        return "; ".join(pairs)
    return value.split(";")[0].strip() or None


def build_forward_headers(
    *,
    auth_cookie: str | None = None,
    extra: dict[str, str] | None = None,
) -> dict[str, str]:
    """Header gửi sang CinemaStar API, luôn chuyển tiếp cookie đăng nhập nếu có."""
    headers = dict(extra or {})
    cookie = normalize_cookie_header(auth_cookie)
    if cookie:
        headers["Cookie"] = cookie
    return headers


def _build_url(path: str, query_params: dict[str, str] | None = None) -> str:
    base = settings.CINEMA_API_BASE_URL.rstrip("/")
    normalized_path = path if path.startswith("/") else f"/{path}"
    url = f"{base}{normalized_path}"
    if query_params:
        from urllib.parse import urlencode

        qs = urlencode({k: v for k, v in query_params.items() if v})
        if qs:
            url = f"{url}?{qs}"
    return url


def post_json(
    path: str,
    body: dict[str, Any],
    *,
    auth_cookie: str | None = None,
) -> Any:
    """Call CinemaStar backend POST endpoint and return parsed JSON payload."""
    url = _build_url(path)
    headers = build_forward_headers(
        auth_cookie=auth_cookie,
        extra={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )

    payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=payload, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=settings.CINEMA_API_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        error_payload: Any = None
        try:
            error_payload = json.loads(body_text) if body_text else None
        except json.JSONDecodeError:
            error_payload = {
                "success": False,
                "message": body_text or "Yêu cầu thất bại",
                "code": exc.code,
            }
        logger.warning("Cinema API HTTP {}: {}", exc.code, error_payload)
        raise CinemaApiError(str(error_payload), status_code=exc.code, payload=error_payload) from exc
    except urllib.error.URLError as exc:
        logger.warning("Cinema API connection error: {}", exc.reason)
        raise CinemaApiError(
            f"Không kết nối được tới CinemaStar API: {exc.reason}",
            status_code=503,
        ) from exc

    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CinemaApiError("Phản hồi API không phải JSON hợp lệ", status_code=502) from exc

    if isinstance(parsed, dict) and parsed.get("success") is False:
        raise CinemaApiError(
            str(parsed.get("message") or parsed),
            status_code=200,
            payload=parsed,
        )

    if isinstance(parsed, dict) and "success" in parsed and "data" in parsed:
        return parsed["data"]

    return parsed


def get_json(
    path: str,
    *,
    query_params: dict[str, str] | None = None,
    auth_cookie: str | None = None,
) -> Any:
    """Call CinemaStar backend GET endpoint and return parsed JSON payload."""
    url = _build_url(path, query_params)
    headers = build_forward_headers(
        auth_cookie=auth_cookie,
        extra={"Accept": "application/json"},
    )

    request = urllib.request.Request(url, method="GET", headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=settings.CINEMA_API_TIMEOUT) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        payload: Any = None
        try:
            payload = json.loads(body) if body else None
        except json.JSONDecodeError:
            payload = {"success": False, "message": body or "Yêu cầu thất bại", "code": exc.code}
        logger.warning("Cinema API HTTP {}: {}", exc.code, payload)
        raise CinemaApiError(str(payload), status_code=exc.code, payload=payload) from exc
    except urllib.error.URLError as exc:
        logger.warning("Cinema API connection error: {}", exc.reason)
        raise CinemaApiError(
            f"Không kết nối được tới CinemaStar API: {exc.reason}",
            status_code=503,
        ) from exc

    if not raw:
        return None
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise CinemaApiError("Phản hồi API không phải JSON hợp lệ", status_code=502) from exc

    if isinstance(payload, dict) and payload.get("success") is False:
        raise CinemaApiError(
            str(payload.get("message") or payload),
            status_code=200,
            payload=payload,
        )

    if isinstance(payload, dict) and "success" in payload and "data" in payload:
        return payload["data"]

    return payload
