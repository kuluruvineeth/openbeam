from __future__ import annotations

from datetime import UTC, datetime

import pytest

from engine.common.security.audit import (
    SECURITY_CONCERN_EVENTS,
    AuditLogger,
    AuditRecord,
    SecurityEvent,
)


class TestSecurityEvent:
    def test_auth_events_exist(self):
        assert SecurityEvent.AUTH_SUCCESS.value == "auth.success"
        assert SecurityEvent.AUTH_FAILURE.value == "auth.failure"
        assert SecurityEvent.AUTH_INVALID_KEY.value == "auth.invalid_key"

    def test_rate_limit_events_exist(self):
        assert SecurityEvent.RATE_LIMIT_EXCEEDED.value == "rate_limit.exceeded"
        assert SecurityEvent.RATE_LIMIT_WARNING.value == "rate_limit.warning"

    def test_access_events_exist(self):
        assert SecurityEvent.ACCESS_GRANTED.value == "access.granted"
        assert SecurityEvent.ACCESS_DENIED.value == "access.denied"

    def test_request_events_exist(self):
        assert SecurityEvent.REQUEST_BLOCKED.value == "request.blocked"
        assert SecurityEvent.REQUEST_SUSPICIOUS.value == "request.suspicious"

    def test_config_event_exists(self):
        assert SecurityEvent.CONFIG_CHANGE.value == "config.change"

    def test_string_enum(self):
        assert isinstance(SecurityEvent.AUTH_SUCCESS, str)
        assert SecurityEvent.AUTH_SUCCESS == "auth.success"


class TestSecurityConcernEvents:
    def test_failure_events_are_concerns(self):
        assert SecurityEvent.AUTH_FAILURE in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.AUTH_INVALID_KEY in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.ACCESS_DENIED in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.RATE_LIMIT_EXCEEDED in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.REQUEST_BLOCKED in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.REQUEST_SUSPICIOUS in SECURITY_CONCERN_EVENTS

    def test_success_events_not_concerns(self):
        assert SecurityEvent.AUTH_SUCCESS not in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.ACCESS_GRANTED not in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.RATE_LIMIT_WARNING not in SECURITY_CONCERN_EVENTS
        assert SecurityEvent.CONFIG_CHANGE not in SECURITY_CONCERN_EVENTS

    def test_frozenset_immutable(self):
        with pytest.raises(AttributeError):
            SECURITY_CONCERN_EVENTS.add(SecurityEvent.AUTH_SUCCESS)


class TestAuditRecord:
    def test_immutable(self):
        record = AuditRecord(
            event=SecurityEvent.AUTH_SUCCESS,
            timestamp=datetime.now(UTC),
            request_id="test-123",
        )
        with pytest.raises(AttributeError):
            record.event = SecurityEvent.AUTH_FAILURE

    def test_all_fields(self):
        now = datetime.now(UTC)
        record = AuditRecord(
            event=SecurityEvent.ACCESS_GRANTED,
            timestamp=now,
            request_id="req-456",
            client_ip="192.168.1.1",
            key_id="sk_live_...",
            path="/api/parse",
            method="POST",
            status_code=200,
            details={"extra": "data"},
        )
        assert record.event == SecurityEvent.ACCESS_GRANTED
        assert record.timestamp == now
        assert record.request_id == "req-456"
        assert record.client_ip == "192.168.1.1"
        assert record.key_id == "sk_live_..."
        assert record.path == "/api/parse"
        assert record.method == "POST"
        assert record.status_code == 200
        assert record.details == {"extra": "data"}

    def test_default_values(self):
        record = AuditRecord(
            event=SecurityEvent.AUTH_SUCCESS,
            timestamp=datetime.now(UTC),
            request_id="test",
        )
        assert record.client_ip is None
        assert record.key_id is None
        assert record.path is None
        assert record.method is None
        assert record.status_code is None
        assert record.details == {}


class TestAuditLogger:
    def test_can_create_logger(self):
        logger = AuditLogger()
        assert logger is not None

    def test_log_returns_record(self):
        logger = AuditLogger()
        record = logger.log(SecurityEvent.AUTH_SUCCESS, key_id="test")
        assert isinstance(record, AuditRecord)
        assert record.event == SecurityEvent.AUTH_SUCCESS
        assert record.key_id == "test"

    def test_log_with_all_params(self):
        logger = AuditLogger()
        record = logger.log(
            SecurityEvent.ACCESS_GRANTED,
            client_ip="10.0.0.1",
            key_id="sk_test_...",
            path="/health",
            method="GET",
            status_code=200,
            custom_field="custom_value",
        )
        assert record.client_ip == "10.0.0.1"
        assert record.details["custom_field"] == "custom_value"

    def test_log_captures_timestamp(self):
        logger = AuditLogger()
        before = datetime.now(UTC)
        record = logger.log(SecurityEvent.AUTH_SUCCESS)
        after = datetime.now(UTC)
        assert before <= record.timestamp <= after
