# Metric Catalog

This catalog lists core production metrics currently expected in OpenBeam telemetry.

## API Server
- `http_request_duration_seconds` (histogram)
  - labels: `method`, `route`, `status_code`
  - purpose: API latency + request volume + availability SLOs
- `http_errors_total` (counter)
  - labels: `method`, `route`, `status_code`, `error_type`
  - purpose: HTTP error trend and signature analysis
- `application_errors_total` (counter)
  - labels: `error_type`, `error_code`, `endpoint`
  - purpose: app exception taxonomy
- `search_queries_total` (counter)
  - labels: `endpoint`
  - purpose: search endpoint throughput

## Worker
- `sync_jobs_total` (counter)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: sync success/failure/retry rates
- `sync_documents_total` (counter)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: document sync throughput
- `sync_duration_seconds` (histogram)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: sync runtime distribution
- `sync_queue_depth` (gauge)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: queue pressure and backlog
- `queue_processing_lag_seconds` (gauge)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: queue delay/staleness indicator
- `index_errors_total` (counter)
  - labels: `worker_type`, `task_queue`, `status`
  - purpose: indexing error trend

## Engine
- `engine_http_requests_total` (counter)
  - labels: `method`, `route`, `status_code`
  - purpose: engine request throughput and error mix
- `engine_http_request_duration_seconds` (histogram)
  - labels: `method`, `route`
  - purpose: engine endpoint latency
- `engine_http_requests_in_flight` (gauge)
  - labels: none
  - purpose: saturation signal
- `engine_model_inference_latency_seconds` (histogram)
  - labels: `model`, `operation`
  - purpose: parse/embed/rerank latency
- `engine_gpu_service_latency_seconds` (histogram)
  - labels: `endpoint`
  - purpose: GPU-side dependency latency

## Recording Rules
- `openbeam:http_request_rate_5m`
- `openbeam:http_error_rate_5m`
- `openbeam:http_latency_p95_5m`

## Dashboards Using This Catalog
- `OpenBeam Command Center`
- `Platform SLO Overview`
- `OpenBeam Error Analysis`
- `Logs Error Drilldown`
- `Connector Sync Operations`
- `Engine Performance`
