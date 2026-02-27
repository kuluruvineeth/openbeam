# Observability Developer Guide

This folder defines the operational contract for metrics, logs, dashboards, and alerts.

## Goals
- Add useful telemetry in under 5 minutes.
- Keep metric cardinality safe by default.
- Keep logs correlation-friendly (`trace_id`, `request_id`) for fast incident triage.
- Keep dashboards and alerts code-defined and repeatable.

## Canonical Contract

### Required log fields
- `timestamp`
- `level`
- `message`
- `service`
- `env`
- `version`
- `trace_id`
- `span_id`
- `request_id`

### Metric naming and labels
- Metric prefix: `openplane_` for new metrics.
- Use units in names where relevant (`_seconds`, `_bytes`, `_total`).
- Allowed labels: `service`, `env`, `route`, `method`, `status_code`, `component`, `connector_type`, `worker_type`.
- Never use high-cardinality IDs as metric labels (`request_id`, `trace_id`, `user_id`, `team_id`, document IDs).

## Commands
- Validate observability assets:
```bash
bun run observability:validate
```
- Run monitoring smoke checks:
```bash
bun run observability:smoke
```
- Generate metric stub:
```bash
bun run observability:new-metric -- --name openplane_example_total --type counter --labels service,env --help "Example metric"
```
- Generate log-event helper:
```bash
bun run observability:new-log-event -- --event connector_sync_failed --fields connector_id:string,team_id:string,error_code:string --level error
```

## Docs
- `docs/observability/how-to-add-logs.md`
- `docs/observability/how-to-add-metrics.md`
- `docs/observability/metric-catalog.md`
- `docs/observability/runbooks/`
