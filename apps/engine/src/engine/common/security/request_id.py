from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")

REQUEST_ID_HEADER = "X-Request-ID"


def get_request_id() -> str:
    """Get current request ID from context."""
    return _request_id_ctx.get()


def _generate_request_id() -> str:
    return str(uuid.uuid4())


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value, version=4)
    except ValueError:
        return False
    else:
        return True


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware for request ID correlation and propagation."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming_id = request.headers.get(REQUEST_ID_HEADER)

        if incoming_id and _is_valid_uuid(incoming_id):
            request_id = incoming_id
        else:
            request_id = _generate_request_id()

        _request_id_ctx.set(request_id)
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request_id

        return response
