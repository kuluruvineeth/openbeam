# Loki Ingestion Failure Runbook

## Scope
Use this runbook when any of these alerts fire:
- `LokiMetricsAbsent`
- `PromtailMetricsAbsent`
- `LokiIngestionStalled`
- `PromtailDroppingLogs`

## Impact
- Loss of centralized logs and degraded incident triage.
- Missing trace/request correlation paths during production incidents.
- Reduced forensic and compliance visibility.

## Fast Triage (first 10 minutes)
1. Check Loki readiness:
```bash
curl -sf http://localhost:3100/ready
```
2. Check Promtail status/logs:
```bash
docker compose -f docker-compose.infra.yml ps promtail loki
docker compose -f docker-compose.infra.yml logs --tail=300 promtail loki
```
3. Verify Grafana Loki datasource connectivity.
4. Run Loki API smoke query:
```bash
curl -G -s "http://localhost:3100/loki/api/v1/query" --data-urlencode 'query=count_over_time({service=~"openplane-.*"}[5m])'
```

## Diagnosis Checklist
- Is Loki up but rejecting writes (auth, limits, disk pressure)?
- Is Promtail dropping entries due to parse/relabel issues?
- Is filesystem or disk utilization causing ingestion backpressure?
- Did a recent config change break labels or pipeline stages?

## Mitigation
1. Restore Loki availability first (restart pod/container, free disk, fix config).
2. Fix Promtail parsing/relabel stage errors and redeploy.
3. Temporarily reduce high-volume noisy log streams if ingestion is saturated.
4. Backfill critical incident data from container logs if central logs were lost.

## Verification
- Loki readiness passes continuously.
- Promtail dropped entries stop increasing.
- `count_over_time` queries return recent logs for core services.
- Loki-related alerts resolve.

## Escalation
- Critical: page `platform-observability`.
- If ingestion pipeline outage exceeds SLA window, open incident and notify customer-facing teams.
