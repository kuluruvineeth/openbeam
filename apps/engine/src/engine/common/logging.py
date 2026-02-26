from __future__ import annotations

import logging
import os
import sys
from collections.abc import Mapping, MutableMapping
from contextvars import ContextVar
from typing import TYPE_CHECKING, Any, cast

import structlog

if TYPE_CHECKING:
    from engine.common.config import BaseServiceSettings

REDACTED_VALUE = "[REDACTED]"
SENSITIVE_KEY_TOKENS = (
    "authorization",
    "cookie",
    "password",
    "token",
    "secret",
    "apikey",
    "accesstoken",
    "refreshtoken",
)

_service_ctx: ContextVar[str] = ContextVar("service_name", default="openplane-engine")
_env_ctx: ContextVar[str] = ContextVar("service_env", default="development")
_version_ctx: ContextVar[str] = ContextVar("service_version", default="0.2.0")
_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
_trace_id_ctx: ContextVar[str | None] = ContextVar("trace_id", default=None)
_span_id_ctx: ContextVar[str | None] = ContextVar("span_id", default=None)
EventDict = MutableMapping[str, Any]


def _is_hex(value: str) -> bool:
    try:
        int(value, 16)
    except ValueError:
        return False
    return True


def _parse_traceparent(traceparent: str | None) -> tuple[str | None, str | None]:
    if traceparent is None:
        return None, None

    parts = traceparent.strip().split("-")
    if len(parts) != 4:
        return None, None

    trace_id = parts[1].lower()
    span_id = parts[2].lower()

    if len(trace_id) != 32 or len(span_id) != 16:
        return None, None

    if not (_is_hex(trace_id) and _is_hex(span_id)):
        return None, None

    if trace_id == "0" * 32 or span_id == "0" * 16:
        return None, None

    return trace_id, span_id


def _get_header_value(headers: Mapping[str, str], name: str) -> str | None:
    direct = headers.get(name)
    if direct is not None:
        return direct

    lower_name = name.lower()
    for key, value in headers.items():
        if key.lower() == lower_name:
            return value
    return None


def extract_trace_context_from_headers(
    headers: Mapping[str, str],
) -> tuple[str | None, str | None]:
    traceparent = _get_header_value(headers, "traceparent")
    return _parse_traceparent(traceparent)


def bind_request_context(
    *,
    request_id: str | None = None,
    trace_id: str | None = None,
    span_id: str | None = None,
) -> None:
    _request_id_ctx.set(request_id)
    _trace_id_ctx.set(trace_id)
    _span_id_ctx.set(span_id)


def clear_request_context() -> None:
    _request_id_ctx.set(None)
    _trace_id_ctx.set(None)
    _span_id_ctx.set(None)


def _looks_sensitive(key: str) -> bool:
    normalized = key.replace("_", "").replace("-", "").lower()
    return any(token in normalized for token in SENSITIVE_KEY_TOKENS)


def _redact(value: object) -> object:
    if isinstance(value, Mapping):
        redacted: dict[str, object] = {}
        for raw_key, nested_value in value.items():
            key = str(raw_key)
            redacted[key] = (
                REDACTED_VALUE if _looks_sensitive(key) else _redact(nested_value)
            )
        return redacted

    if isinstance(value, list):
        return [_redact(item) for item in value]

    if isinstance(value, tuple):
        return tuple(_redact(item) for item in value)

    return value


def _extract_current_span_ids() -> tuple[str | None, str | None]:
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        span_ctx = span.get_span_context()
        if span_ctx and span_ctx.trace_id != 0 and span_ctx.span_id != 0:
            return (
                format(span_ctx.trace_id, "032x"),
                format(span_ctx.span_id, "016x"),
            )
    except ImportError:
        pass

    return None, None


def _add_telemetry_context(
    _logger: Any,
    _method_name: str,
    event_dict: EventDict,
) -> EventDict:
    event_dict.setdefault("service", _service_ctx.get())
    event_dict.setdefault("env", _env_ctx.get())
    event_dict.setdefault("version", _version_ctx.get())

    request_id = _request_id_ctx.get()
    if request_id:
        event_dict.setdefault("request_id", request_id)

    trace_id = _trace_id_ctx.get()
    span_id = _span_id_ctx.get()
    if trace_id and span_id:
        event_dict.setdefault("trace_id", trace_id)
        event_dict.setdefault("span_id", span_id)
        return event_dict

    current_trace_id, current_span_id = _extract_current_span_ids()
    if current_trace_id and current_span_id:
        event_dict.setdefault("trace_id", current_trace_id)
        event_dict.setdefault("span_id", current_span_id)

    return event_dict


def _normalize_message(
    _logger: Any,
    _method_name: str,
    event_dict: EventDict,
) -> EventDict:
    event = event_dict.pop("event", None)
    if event is not None and "message" not in event_dict:
        event_dict["message"] = str(event)
    return event_dict


def _redact_processor(
    _logger: Any,
    _method_name: str,
    event_dict: EventDict,
) -> EventDict:
    return cast(EventDict, _redact(event_dict))


def configure_logging(
    settings: BaseServiceSettings,
    *,
    service_name: str = "openplane-engine",
) -> None:
    _service_ctx.set(service_name)
    _env_ctx.set(settings.environment)
    _version_ctx.set(os.environ.get("APP_VERSION", "0.2.0"))

    shared_processors: list[structlog.typing.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso", key="timestamp"),
        _add_telemetry_context,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        _normalize_message,
        _redact_processor,
        structlog.processors.UnicodeDecoder(),
    ]

    renderer: structlog.typing.Processor
    if settings.environment == "development":
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(settings.log_level)

    for logger_name in ["uvicorn", "uvicorn.error", "uvicorn.access", "ray"]:
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.propagate = True


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))
