# How To Add Metrics

## 1. Pick metric type
- `counter`: monotonically increasing totals (`*_total`).
- `gauge`: current state (`queue_depth`, `in_flight`).
- `histogram`: latency or size distributions (`*_seconds`, `*_bytes`).

## 2. Generate a typed metric stub

```bash
bun run observability:new-metric -- --name openbeam_connector_sync_jobs_total --type counter --labels worker_type,status --help "Total connector sync jobs" --out apps/worker/src/metrics/openbeam-connector-sync-jobs-total.ts
```

The generated stub includes:
- typed label names (`as const`)
- `registers: [register]` for registry wiring
- metric constructor for selected type

## 3. Register metric in service metrics file
Import the generated metric into the target metrics module and ensure it is exported where needed.

## 4. Instrument the code path
Increment/observe/set in the exact execution path you care about.

```ts
syncJobsTotal.inc({ worker_type: "github", task_queue: "sync", status: "success" });
```

## 5. Verify end-to-end
- Local scrape:
```bash
curl -s http://localhost:3000/metrics | grep openbeam_connector_sync_jobs_total
```
- Prometheus query check:
```bash
curl -G -s http://localhost:9090/api/v1/query --data-urlencode 'query=openbeam_connector_sync_jobs_total'
```
- Dashboard render check in Grafana.

## 6. Cardinality guardrails
Do not add these as metric labels:
- `request_id`
- `trace_id`
- `user_id`
- `team_id`
- connector IDs or document IDs

Use logs for those dimensions.
