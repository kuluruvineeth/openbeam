# Monitoring

Prometheus, Grafana, Loki, and Promtail setup for OpenPlane.

## Quick Start

```bash
docker compose up -d
./monitoring/test-monitoring.sh
```

## Services

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/admin)
- Loki: http://localhost:3100
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

# Loki labels
curl http://localhost:3100/loki/api/v1/labels | jq
```

**Generate logs:**

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

**Logs not appearing in Grafana?**

- Check Loki health: `curl http://localhost:3100/ready`
- Check Promtail logs: `docker compose -f docker-compose.infra.yml logs promtail`
- Verify datasource: Grafana -> Connections -> Loki

**Dashboards empty?**

- Test query in Prometheus directly
- Check time range has data
- Verify data source configured
