from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

HTTP_REQUESTS_TOTAL = Counter(
    "engine_http_requests_total",
    "Total HTTP requests",
    ["method", "route", "status_code"],
)

HTTP_REQUEST_DURATION = Histogram(
    "engine_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "route"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

HTTP_REQUESTS_IN_FLIGHT = Gauge(
    "engine_http_requests_in_flight",
    "In-flight HTTP requests",
)

MODEL_INFERENCE_LATENCY = Histogram(
    "engine_model_inference_latency_seconds",
    "Model inference latency in seconds",
    ["model", "operation"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

MODEL_BATCH_SIZE = Histogram(
    "engine_model_batch_size",
    "Batch size for model inference",
    ["model"],
    buckets=(1, 2, 4, 8, 16, 32, 64, 128),
)

DOCUMENTS_PARSED_TOTAL = Counter(
    "engine_documents_parsed_total",
    "Total documents parsed",
    ["file_type", "status"],
)

CHUNKS_CREATED_TOTAL = Counter(
    "engine_chunks_created_total",
    "Total chunks created",
    ["strategy"],
)

GPU_SERVICE_CALLS_TOTAL = Counter(
    "engine_gpu_service_calls_total",
    "Total calls to GPU service",
    ["endpoint", "status"],
)

GPU_SERVICE_LATENCY = Histogram(
    "engine_gpu_service_latency_seconds",
    "GPU service call latency",
    ["endpoint"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)
