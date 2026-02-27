# Worker Backlog Runbook

## Scope
Use this runbook when any of these alerts fire:
- `ConnectorSyncFailureBurnCritical`
- `ConnectorSyncFailureBurnWarning`
- `WorkerQueueBacklogHigh`
- `WorkerMetricsAbsent`

## Impact
- Delayed or failed sync/index jobs.
- Stale enterprise data in search/assistant results.
- Potential SLA misses for connector freshness windows.

## Fast Triage (first 10 minutes)
1. Open `Connector Sync Operations` dashboard.
2. Identify failing `worker_type`, `task_queue`, and status mix.
3. Check queue depth and queue processing lag trend.
4. Inspect worker logs for retries/rate limits/fence conflicts:
```bash
docker compose logs --tail=300 worker
```

## Diagnosis Checklist
- Are failures concentrated on one connector provider?
- Are retries caused by auth errors, provider 429s, or payload failures?
- Is queue lag increasing because of throughput drop or worker crash loops?
- Are rate-limit or fence-conflict counters rising rapidly?

## Mitigation
1. Pause or throttle noisy/failing connector tenants.
2. Increase worker concurrency for healthy queues.
3. Fix auth/token refresh for failing connector.
4. If backlog is large, prioritize critical enterprise tenants first.

## Verification
- Failure ratio trends down.
- Queue depth and lag decrease continuously.
- Success throughput recovers.
- Connector burn-rate alerts resolve.

## Escalation
- Critical: page `integrations-platform`.
- If provider outage is external, communicate ETA and degraded mode status.
