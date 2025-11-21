# OpenPlane Monitoring

Professional monitoring setup for OpenPlane using Prometheus and Grafana.

## Services

- **Prometheus**: Metrics collection and storage (Port 9090)
- **Grafana**: Visualization and dashboards (Port 3002)

## Quick Start

1. Start all services:

   ```bash
   docker-compose up -d
   ```

2. Access Grafana:

   - URL: http://localhost:3002
   - Default credentials: `admin` / `admin`
   - Change password on first login

3. Access Prometheus:
   - URL: http://localhost:9090

## Dashboards

### OpenPlane Command Center

- Business overview (search traffic, conversion, indexed docs)
- API health (request latency histogram, error budget burn, worker backlog)
- Brand-aligned palette (pink `#ff7ccd`, blue `#6ea8fe`, yellow `#fef08a`)

### Vespa Overview

- Split gauges for disk + memory saturation plus an aggregated saturation gauge
- Query performance: segmented rate (2xx/4xx/5xx) and Vespa-reported latency streams
- Indexing instrumentation: per-minute feed rate, 5xx feed failures, total searchable docs
- Error visibility: 4xx/5xx percentages derived from request mix
- All panels pin to the Prometheus data source UID `prometheus`

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=your-secure-password
GRAFANA_PORT=3002

# Prometheus
PROMETHEUS_PORT=9090
```

### Custom Dashboards

Add dashboard JSON to `monitoring/grafana/dashboards/`. Provisioning auto-loads each file. Keep only the canonical JSON so Grafana’s provisioning stays deterministic.

## Metrics Collected

### Vespa Metrics

- Resource usage (disk, memory)
- Query rate and latency
- Document indexing statistics
- Error rates by status code
- System health indicators

## Troubleshooting

### Check Prometheus Targets

Visit http://localhost:9090/targets to verify all targets are up.

### Check Grafana Data Source

1. Go to Configuration > Data Sources
2. Verify Prometheus is connected and healthy

### View Logs

```bash
docker-compose logs -f prometheus grafana
```
