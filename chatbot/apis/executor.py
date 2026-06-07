from __future__ import annotations

import json
from typing import Any

from .catalog import (
    API_CATALOG,
    _QUERY_PARAM_API_NAMES,
    ApiDefinition,
    clamp_request_body_sizes,
    is_role_allowed,
    normalize_user_role,
)
from .client import CinemaApiError, get_json, post_json


class ApiExecutionError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        backend_response: object | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.backend_response = backend_response


def _param_value(params: dict[str, str], key: str) -> str:
    return (params.get(key) or "").strip()


def path_params_for_api(api_id: str, raw_params: dict[str, str] | None) -> dict[str, str]:
    api = API_CATALOG.get(api_id)
    if not api:
        return {}
    params = raw_params or {}
    resolved: dict[str, str] = {}
    for key in api.path_params:
        value = _param_value(params, key)
        if value:
            resolved[key] = value
    return resolved


def query_params_for_api(api_id: str, raw_params: dict[str, str] | None) -> dict[str, str]:
    api = API_CATALOG.get(api_id)
    if not api:
        return {}
    params = raw_params or {}
    mapping = _QUERY_PARAM_API_NAMES.get(api_id, {})
    resolved: dict[str, str] = {}
    for key in api.query_params:
        value = _param_value(params, key)
        if value:
            api_key = mapping.get(key, key)
            resolved[api_key] = value
    return resolved


def build_request_summary(
    api_id: str,
    path_params: dict[str, str],
    query_params: dict[str, str],
    request_body: dict[str, Any] | None = None,
) -> str:
    api = API_CATALOG.get(api_id)
    path = api.path if api else api_id
    for key, value in path_params.items():
        path = path.replace(f"{{{key}}}", value)
    qs = "&".join(f"{k}={v}" for k, v in query_params.items())
    if qs:
        path = f"{path}?{qs}"
    method = api.method if api else "GET"
    if method == "POST" and request_body is not None:
        body_text = json.dumps(request_body, ensure_ascii=False, sort_keys=True)
        return f"{method} {path} body={body_text}"
    return f"{method} {path}"


def _render_path(api: ApiDefinition, path_params: dict[str, str]) -> str:
    path = api.path
    for key in api.path_params:
        value = _param_value(path_params, key)
        if not value:
            raise ApiExecutionError(f"Thiếu path_params.{key} cho api_id={api.api_id}")
        path = path.replace(f"{{{key}}}", value)
    return path


def _assert_role(api: ApiDefinition, user_role: str) -> None:
    if not is_role_allowed(api, user_role):
        role = normalize_user_role(user_role)
        allowed = ", ".join(api.allowed_roles)
        raise ApiExecutionError(
            f"Vai trò '{role}' không được gọi API '{api.api_id}'. "
            f"Vai trò được phép: {allowed}",
            status_code=403,
        )


def execute(
    api_id: str,
    *,
    user_role: str = "CUSTOMER",
    auth_cookie: str | None = None,
    path_params: dict[str, str] | None = None,
    query_params: dict[str, str] | None = None,
    request_body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a catalog API against CinemaStar backend."""
    if api_id not in API_CATALOG:
        raise ApiExecutionError(f"api_id không hợp lệ: {api_id}", status_code=400)

    api = API_CATALOG[api_id]
    if api.method not in {"GET", "POST"}:
        raise ApiExecutionError(f"Chỉ hỗ trợ GET/POST, nhận {api.method}", status_code=400)

    _assert_role(api, user_role)

    path_params = path_params_for_api(api_id, path_params)
    query_params = query_params_for_api(api_id, query_params)
    rendered_path = _render_path(api, path_params)

    try:
        if api.method == "GET":
            data = get_json(rendered_path, query_params=query_params, auth_cookie=auth_cookie)
        else:
            body = clamp_request_body_sizes(request_body or {})
            if not body:
                raise ApiExecutionError(
                    f"Thiếu request_body cho POST api_id={api_id}",
                    status_code=400,
                )
            data = post_json(rendered_path, body, auth_cookie=auth_cookie)
    except ApiExecutionError:
        raise
    except CinemaApiError as exc:
        backend_response = exc.payload
        if backend_response is None:
            backend_response = {
                "success": False,
                "message": str(exc),
                "code": exc.status_code,
            }
        raise ApiExecutionError(
            str(exc),
            status_code=exc.status_code,
            backend_response=backend_response,
        ) from exc

    if isinstance(data, dict):
        return data
    return {"data": data}
