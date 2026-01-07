from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from engine.common.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class APIKeyAuth:
    key_id: str
    key_hash: str
    authenticated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def __repr__(self) -> str:
        return f"APIKeyAuth(key_id={self.key_id!r})"


_api_key_header = APIKeyHeader(
    name="X-API-Key",
    scheme_name="API Key",
    description="API key for service authentication",
    auto_error=False,
)


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def _extract_key_id(key: str) -> str:
    if len(key) > 12:
        return f"{key[:12]}..."
    return key


def _constant_time_compare(a: str, b: str) -> bool:
    return secrets.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


async def verify_api_key(
    api_key: str | None = Security(_api_key_header),
) -> APIKeyAuth:
    """Verify API key from X-API-Key header."""
    from engine.common.config import get_security_settings

    settings = get_security_settings()

    if not settings.require_auth:
        logger.debug("auth_disabled", reason="require_auth=False")
        return APIKeyAuth(key_id="dev-mode", key_hash="dev-mode")

    if not api_key:
        logger.warning("auth_failed", reason="missing_api_key")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    for valid_key in settings.api_keys:
        if _constant_time_compare(api_key, valid_key.get_secret_value()):
            key_id = _extract_key_id(api_key)
            key_hash = _hash_key(api_key)
            logger.info("auth_success", key_id=key_id)
            return APIKeyAuth(key_id=key_id, key_hash=key_hash)

    key_id = _extract_key_id(api_key)
    logger.warning("auth_failed", reason="invalid_api_key", key_id=key_id)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid API key",
    )


RequireAPIKey = Annotated[APIKeyAuth, Depends(verify_api_key)]


def generate_api_key(prefix: str = "sk_live") -> str:
    """Generate a cryptographically secure API key."""
    token = secrets.token_urlsafe(24)
    return f"{prefix}_{token}"
