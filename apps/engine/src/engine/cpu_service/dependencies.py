from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request

from engine.common.security import (
    APIKeyAuth,
    RateLimiter,
    SecurityEvent,
    audit_logger,
    get_client_identifier,
    get_client_ip,
    verify_api_key,
)


async def rate_limit_dependency(request: Request) -> None:
    """Rate limiting dependency for protected routes."""
    if not hasattr(request.app.state, "rate_limiter"):
        return

    rate_limiter: RateLimiter = request.app.state.rate_limiter
    identifier = get_client_identifier(request)
    await rate_limiter.check_and_raise(identifier)


async def auth_and_audit_dependency(
    request: Request,
    auth: APIKeyAuth = Depends(verify_api_key),
) -> APIKeyAuth:
    """Combined auth and audit logging dependency."""
    request.state.auth = auth

    audit_logger.log(
        SecurityEvent.ACCESS_GRANTED,
        client_ip=get_client_ip(request),
        key_id=auth.key_id,
        path=request.url.path,
        method=request.method,
    )

    return auth


AuthDep = Annotated[APIKeyAuth, Depends(auth_and_audit_dependency)]
RateLimitDep = Depends(rate_limit_dependency)
