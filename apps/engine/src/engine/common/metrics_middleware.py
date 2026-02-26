from __future__ import annotations

from collections.abc import Awaitable, Callable
from time import perf_counter

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from engine.common.logging import (
    bind_request_context,
    clear_request_context,
    extract_trace_context_from_headers,
)
from engine.common.metrics import (
    HTTP_REQUEST_DURATION,
    HTTP_REQUESTS_IN_FLIGHT,
    HTTP_REQUESTS_TOTAL,
)
from engine.common.security.request_id import REQUEST_ID_HEADER


def _resolve_route_template(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None:
        route_path = getattr(route, "path", None)
        if isinstance(route_path, str) and route_path:
            return route_path

        route_path_format = getattr(route, "path_format", None)
        if isinstance(route_path_format, str) and route_path_format:
            return route_path_format

    return request.url.path


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start_time = perf_counter()
        method = request.method
        status_code = 500

        request_id = getattr(request.state, "request_id", None)
        if not isinstance(request_id, str) or not request_id:
            incoming_request_id = request.headers.get(REQUEST_ID_HEADER)
            request_id = incoming_request_id if incoming_request_id else None

        trace_id, span_id = extract_trace_context_from_headers(request.headers)
        bind_request_context(
            request_id=request_id,
            trace_id=trace_id,
            span_id=span_id,
        )

        HTTP_REQUESTS_IN_FLIGHT.inc()

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration_seconds = perf_counter() - start_time
            route = _resolve_route_template(request)
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                route=route,
                status_code=str(status_code),
            ).inc()
            HTTP_REQUEST_DURATION.labels(
                method=method,
                route=route,
            ).observe(duration_seconds)
            HTTP_REQUESTS_IN_FLIGHT.dec()
            clear_request_context()
