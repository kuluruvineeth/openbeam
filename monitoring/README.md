# Monitoring

Prometheus, Grafana, and Jaeger setup for OpenPlane.

## Quick Start

```bash
docker compose up -d
./monitoring/test-monitoring.sh
```

## Services

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)
- Jaeger: http://localhost:16686
- Worker metrics: http://localhost:9091/metrics
- Redis exporter: http://localhost:9121/metrics

## Testing

```bash
./monitoring/test-monitoring.sh
```

**Manual checks:**

```bash
# Prometheus
curl http://localhost:9090/-/healthy
curl http://localhost:9090/api/v1/targets | jq

# Metrics
curl http://localhost:3000/metrics | grep search_queries_total
curl http://localhost:9091/metrics | grep sync_jobs_total

# Jaeger
curl http://localhost:16686/api/services | jq
```

**Generate traces:**

```bash
for i in {1..5}; do
  curl "http://localhost:3000/api/v1/search?q=test$i" &
done
wait
```

## Dashboards

- **OpenPlane Command Center** - Business metrics and API health
- **Vespa Overview** - Resource usage, query performance, indexing stats
- **Worker Performance** - Sync/index jobs, queue depths, rate limits

## Adding Metrics/Dashboards

**Add a metric:**

1. Expose metric via Prometheus client (e.g., `prom-client`)
2. Make it available at `/metrics` endpoint
3. Prometheus will auto-scrape it

**Add a dashboard:**

1. Create dashboard JSON in Grafana UI
2. Export and save to `monitoring/grafana/dashboards/`
3. Restart Grafana to load it

Example minimal dashboard JSON (`monitoring/grafana/dashboards/my-dashboard.json`):

```json
{
  "title": "My Dashboard",
  "panels": [
    {
      "id": 1,
      "title": "My Metric",
      "type": "stat",
      "targets": [
        {
          "expr": "my_metric_total",
          "refId": "A",
          "datasource": { "type": "prometheus", "uid": "prometheus" }
        }
      ],
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
    }
  ],
  "schemaVersion": 38,
  "version": 0
}
```

## Troubleshooting

**Metrics not showing?**

- Check targets: `curl http://localhost:9090/api/v1/targets`
- Check logs: `docker compose logs server worker`

**Traces not appearing?**

- Check OTLP endpoint: `echo $OTEL_EXPORTER_OTLP_ENDPOINT`
- Verify instrumentation loaded first in index.ts

**Dashboards empty?**

- Test query in Prometheus directly
- Check time range has data
- Verify data source configured
