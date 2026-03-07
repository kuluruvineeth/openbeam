# High Error Rate Runbook

## Scope
Use this runbook when any of these alerts fire:
- `APIAvailabilityErrorBudgetBurnCritical`
- `APIAvailabilityErrorBudgetBurnWarning`
- `ServerMetricsAbsent`
- `APIServicingMetricsAbsent`

## Impact
- Increased 5xx responses to customer traffic.
- API availability SLO risk (99.9%).
- Possible incident-level customer impact for critical severity.

## Fast Triage (first 10 minutes)
1. Open Grafana dashboard `OpenBeam Command Center` and confirm 5xx/error-ratio trend.
2. Open `Logs Error Drilldown` and filter `level=error|warn` for affected service/env.
3. Identify top failing route/status code/error signature.
4. Check service health and deployment status:
```bash
docker compose ps server
docker compose logs --tail=200 server
```
5. Confirm Prometheus scrape health:
```bash
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="server") | {health:.health,lastError:.lastError}'
```

## Diagnosis Checklist
- Did a recent deploy change auth, routing, DB access, or external API calls?
- Are failures isolated to one route, tenant, connector, or environment?
- Is Vespa/Redis/DB dependency erroring upstream and propagating as 5xx?
- Is request volume spike driving overload (CPU/memory saturation)?

## Mitigation
1. Roll back the most recent server deployment if correlation is strong.
2. Reduce blast radius:
   - Disable failing integration route via feature flag.
   - Apply temporary rate limit on hot failing endpoint.
3. Restart server only if process is wedged and restart is low-risk.
4. If dependency outage is root cause, switch to degraded mode and return controlled fallback responses.

## Verification
- 5xx ratio drops below warning threshold.
- Error signatures stop growing in logs.
- `APIAvailabilityErrorBudgetBurn*` alerts resolve.
- No new major error signatures in the last 15 minutes.

## Escalation
- Critical: page `platform-observability` immediately.
- If data path outage is involved, include `integrations-platform` and DB/Vespa owners.
