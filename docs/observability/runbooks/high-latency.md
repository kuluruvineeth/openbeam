# High Latency Runbook

## Scope
Use this runbook when any of these alerts fire:
- `APILatencyErrorBudgetBurnCritical`
- `APILatencyErrorBudgetBurnWarning`
- `EngineMetricsAbsent`

## Impact
- Slow user requests and degraded UX.
- Timeout retries amplify load and can cascade into failures.
- Latency SLO budget burn for API responsiveness.

## Fast Triage (first 10 minutes)
1. Open `Platform SLO Overview` and verify p95/p99 latency trends.
2. Open `Engine Performance` for route-level and operation-level hotspots.
3. Check in-flight and queue backlog signals.
4. Validate service/container health:
```bash
docker compose ps server engine worker
docker compose logs --tail=200 server engine
```

## Diagnosis Checklist
- Is latency isolated to one route or global across routes?
- Is slowdown from engine operations (embed/rerank/parse) or server path?
- Is upstream dependency latency increased (DB, Redis, Vespa, external API)?
- Is concurrency saturation visible (in-flight requests high, queue lag increasing)?

## Mitigation
1. Scale or restart affected service if resource saturation is confirmed.
2. Temporarily disable expensive operations (e.g., rerank) by feature flag.
3. Tighten timeouts and fail fast for degraded dependencies.
4. Reduce per-request workload (smaller batch size, lighter query mode).

## Verification
- p95/p99 return to baseline.
- In-flight requests and queue lag trend down.
- Latency burn-rate alerts resolve.
- Error rate does not regress while latency improves.

## Escalation
- Critical: page `platform-observability`.
- If model/GPU path is root cause, include engine owners.
