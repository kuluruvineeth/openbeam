from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import ClassVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Security headers middleware following OWASP recommendations."""

    SECURITY_HEADERS: ClassVar[dict[str, str]] = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "0",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Permissions-Policy": (
            "accelerometer=(), ambient-light-sensor=(), autoplay=(), "
            "battery=(), camera=(), cross-origin-isolated=(), "
            "display-capture=(), document-domain=(), encrypted-media=(), "
            "execution-while-not-rendered=(), execution-while-out-of-viewport=(), "
            "fullscreen=(), geolocation=(), gyroscope=(), "
            "keyboard-map=(), magnetometer=(), microphone=(), midi=(), "
            "navigation-override=(), payment=(), picture-in-picture=(), "
            "publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), "
            "usb=(), web-share=(), xr-spatial-tracking=()"
        ),
    }

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)

        for header, value in self.SECURITY_HEADERS.items():
            response.headers[header] = value

        return response
