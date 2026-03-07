from __future__ import annotations

from unittest.mock import MagicMock, patch

from engine.common.tracing import OTEL_SERVICE_NAME, configure_tracing


class TestConfigureTracing:
    def test_disabled_when_no_endpoint(self):
        app = MagicMock()
        settings = MagicMock()

        with patch.dict("os.environ", {}, clear=True):
            configure_tracing(app, settings)

    def test_enabled_when_endpoint_set(self):
        app = MagicMock()
        settings = MagicMock()
        settings.environment = "development"
        settings.is_production = False

        with patch.dict(
            "os.environ",
            {"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317"},
        ):
            configure_tracing(app, settings)

    def test_service_name_constant(self):
        assert OTEL_SERVICE_NAME == "openbeam-engine"


class TestTraceContextProcessor:
    def test_extracts_trace_context_from_traceparent(self):
        from engine.common.logging import extract_trace_context_from_headers

        trace_id, span_id = extract_trace_context_from_headers(
            {"traceparent": ("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01")}
        )

        assert trace_id == "0123456789abcdef0123456789abcdef"
        assert span_id == "0123456789abcdef"

    def test_invalid_traceparent_returns_none(self):
        from engine.common.logging import extract_trace_context_from_headers

        trace_id, span_id = extract_trace_context_from_headers(
            {"traceparent": "invalid"}
        )

        assert trace_id is None
        assert span_id is None
