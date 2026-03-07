from __future__ import annotations

import json
from io import StringIO

from engine.common.config import CPUServiceSettings
from engine.common.logging import (
    bind_request_context,
    clear_request_context,
    configure_logging,
    extract_trace_context_from_headers,
    get_logger,
)


def _last_json_log(output: str) -> dict[str, object]:
    lines = [line for line in output.splitlines() if line.strip()]
    assert lines
    return json.loads(lines[-1])


class TestLoggingContract:
    def test_emits_canonical_fields_and_redacts_sensitive_values(
        self,
        monkeypatch,
    ) -> None:
        stream = StringIO()
        monkeypatch.setenv("APP_VERSION", "1.2.3")
        monkeypatch.setattr("sys.stdout", stream)

        settings = CPUServiceSettings(environment="production", log_level="INFO")
        configure_logging(settings, service_name="openbeam-engine-cpu")

        bind_request_context(
            request_id="req-123",
            trace_id="0123456789abcdef0123456789abcdef",
            span_id="0123456789abcdef",
        )
        get_logger("engine.test").info(
            "request_processed",
            authorization="Bearer test-token",
            connector_id="connector-1",
        )
        clear_request_context()

        payload = _last_json_log(stream.getvalue())

        assert payload["message"] == "request_processed"
        assert payload["service"] == "openbeam-engine-cpu"
        assert payload["env"] == "production"
        assert payload["version"] == "1.2.3"
        assert payload["request_id"] == "req-123"
        assert payload["trace_id"] == "0123456789abcdef0123456789abcdef"
        assert payload["span_id"] == "0123456789abcdef"
        assert payload["level"] == "info"
        assert isinstance(payload["timestamp"], str)
        assert payload["authorization"] == "[REDACTED]"
        assert payload["connector_id"] == "connector-1"

    def test_extract_trace_context_from_traceparent(self) -> None:
        trace_id, span_id = extract_trace_context_from_headers(
            {"Traceparent": ("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01")}
        )

        assert trace_id == "0123456789abcdef0123456789abcdef"
        assert span_id == "0123456789abcdef"
