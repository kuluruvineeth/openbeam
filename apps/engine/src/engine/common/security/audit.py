from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from engine.common.logging import get_logger
from engine.common.security.request_id import get_request_id

logger = get_logger(__name__)


class SecurityEvent(str, Enum):
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILURE = "auth.failure"
    AUTH_INVALID_KEY = "auth.invalid_key"

    RATE_LIMIT_EXCEEDED = "rate_limit.exceeded"
    RATE_LIMIT_WARNING = "rate_limit.warning"

    ACCESS_GRANTED = "access.granted"
    ACCESS_DENIED = "access.denied"

    REQUEST_BLOCKED = "request.blocked"
    REQUEST_SUSPICIOUS = "request.suspicious"

    CONFIG_CHANGE = "config.change"


SECURITY_CONCERN_EVENTS = frozenset({
    SecurityEvent.AUTH_FAILURE,
    SecurityEvent.AUTH_INVALID_KEY,
    SecurityEvent.RATE_LIMIT_EXCEEDED,
    SecurityEvent.ACCESS_DENIED,
    SecurityEvent.REQUEST_BLOCKED,
    SecurityEvent.REQUEST_SUSPICIOUS,
})


@dataclass(frozen=True, slots=True)
class AuditRecord:
    event: SecurityEvent
    timestamp: datetime
    request_id: str
    client_ip: str | None = None
    key_id: str | None = None
    path: str | None = None
    method: str | None = None
    status_code: int | None = None
    details: dict[str, Any] = field(default_factory=dict)


class AuditLogger:
    """Security audit logger for SIEM integration and compliance."""

    def log(
        self,
        event: SecurityEvent,
        *,
        client_ip: str | None = None,
        key_id: str | None = None,
        path: str | None = None,
        method: str | None = None,
        status_code: int | None = None,
        **details: Any,
    ) -> AuditRecord:
        """Log a security audit event."""
        record = AuditRecord(
            event=event,
            timestamp=datetime.now(UTC),
            request_id=get_request_id(),
            client_ip=client_ip,
            key_id=key_id,
            path=path,
            method=method,
            status_code=status_code,
            details=details,
        )

        log_method = logger.warning if event in SECURITY_CONCERN_EVENTS else logger.info
        log_method(
            "audit_event",
            security_event=event.value,
            request_id=record.request_id,
            client_ip=client_ip,
            key_id=key_id,
            path=path,
            method=method,
            status_code=status_code,
            **details,
        )

        return record


audit_logger = AuditLogger()
