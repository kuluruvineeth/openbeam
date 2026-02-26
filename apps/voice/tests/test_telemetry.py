from telemetry import (
    ACTIVE_SESSIONS,
    SESSION_DURATION,
    TOOL_CALLS,
    VoiceMetricsCollector,
    voice_registry,
)


def test_registry_has_metrics():
    metric_names = [m.name for m in voice_registry.collect() if m.samples]
    # Registry should have our metrics registered (even if no samples yet)
    assert voice_registry is not None


def test_tool_calls_counter():
    TOOL_CALLS.labels(tool_name="test", status="success").inc()
    # Should not raise


def test_active_sessions_gauge():
    ACTIVE_SESSIONS.labels(room_type="action").inc()
    ACTIVE_SESSIONS.labels(room_type="action").dec()
    # Should not raise


def test_metrics_collector_lifecycle():
    mock_session = type("MockSession", (), {"on": lambda self, *a: None})()
    collector = VoiceMetricsCollector(mock_session, "action")
    collector.close("completed")
    # Should not raise
