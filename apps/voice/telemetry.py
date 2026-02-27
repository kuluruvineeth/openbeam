import time

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    start_http_server,
)

voice_registry = CollectorRegistry()

SESSION_DURATION = Histogram(
    "openplane_voice_session_duration_seconds",
    "Voice session duration",
    ["room_type", "status"],
    registry=voice_registry,
)
STT_LATENCY = Histogram(
    "openplane_voice_stt_latency_seconds",
    "Speech-to-text latency",
    ["provider", "model"],
    registry=voice_registry,
)
TTS_LATENCY = Histogram(
    "openplane_voice_tts_latency_seconds",
    "Text-to-speech latency",
    ["provider", "model"],
    registry=voice_registry,
)
LLM_TTFT = Histogram(
    "openplane_voice_llm_ttft_seconds",
    "LLM time to first token",
    ["model"],
    registry=voice_registry,
)
TOOL_CALLS = Counter(
    "openplane_voice_tool_calls_total",
    "Voice agent tool calls",
    ["tool_name", "status"],
    registry=voice_registry,
)
ACTIVE_SESSIONS = Gauge(
    "openplane_voice_sessions_active",
    "Active voice sessions",
    ["room_type"],
    registry=voice_registry,
)
INTERRUPTIONS = Counter(
    "openplane_voice_interruptions_total",
    "Voice agent interruptions",
    ["room_type"],
    registry=voice_registry,
)


def start_metrics_server(port: int = 9092) -> None:
    start_http_server(port, registry=voice_registry)


class VoiceMetricsCollector:
    def __init__(self, session: object, room_type: str) -> None:
        self._room_type = room_type
        self._session = session
        self._started_at = time.monotonic()
        if hasattr(session, "on"):
            session.on("metrics_collected", self._on_metrics)
        ACTIVE_SESSIONS.labels(room_type=room_type).inc()

    def _on_metrics(self, agent_metrics: list[object]) -> None:
        for m in agent_metrics:
            if hasattr(m, "ttft"):
                LLM_TTFT.labels(model="gpt-4.1").observe(m.ttft)
            if hasattr(m, "duration"):
                STT_LATENCY.labels(provider="deepgram", model="nova-3").observe(
                    m.duration
                )

    def close(self, status: str = "completed") -> None:
        ACTIVE_SESSIONS.labels(room_type=self._room_type).dec()
        elapsed = time.monotonic() - self._started_at
        SESSION_DURATION.labels(room_type=self._room_type, status=status).observe(elapsed)
