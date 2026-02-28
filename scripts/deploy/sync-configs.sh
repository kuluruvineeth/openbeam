#!/usr/bin/env bash
set -euo pipefail

# Sync monitoring/infra config files to the server.
# Run whenever monitoring configs, Grafana dashboards, or Prometheus rules change.
#
# Usage:
#   scripts/deploy/sync-configs.sh <SERVER_IP>
#
# Example:
#   scripts/deploy/sync-configs.sh 89.167.109.172

SERVER="${1:?Usage: sync-configs.sh <SERVER_IP>}"
DATA_DIR="/mnt/openplane-data"
SSH="ssh -o StrictHostKeyChecking=accept-new root@$SERVER"
SCP="scp -o StrictHostKeyChecking=accept-new"

log() { printf '\033[1;32m[sync]\033[0m %s\n' "$1"; }

log "Syncing configs to $SERVER..."

# Prometheus
log "Prometheus configs..."
$SCP monitoring/prometheus/prometheus.yml "root@$SERVER:$DATA_DIR/configs/prometheus/"
$SCP monitoring/prometheus/alerts.yml "root@$SERVER:$DATA_DIR/configs/prometheus/"
$SCP monitoring/prometheus/recording-rules.yml "root@$SERVER:$DATA_DIR/configs/prometheus/"
$SCP monitoring/prometheus/vespa-exporter.yml "root@$SERVER:$DATA_DIR/configs/prometheus/"

# Grafana
log "Grafana configs..."
$SCP monitoring/grafana/provisioning/datasources/datasource.yml "root@$SERVER:$DATA_DIR/configs/grafana/provisioning/datasources/"
$SCP monitoring/grafana/provisioning/dashboards/dashboard.yml "root@$SERVER:$DATA_DIR/configs/grafana/provisioning/dashboards/"
$SCP monitoring/grafana/dashboards/*.json "root@$SERVER:$DATA_DIR/configs/grafana/dashboards/"

# Loki + Promtail
log "Loki + Promtail configs..."
$SCP monitoring/loki/loki-config.yml "root@$SERVER:$DATA_DIR/configs/loki/"
$SCP monitoring/promtail/promtail-config.yml "root@$SERVER:$DATA_DIR/configs/promtail/"

# Temporal
log "Temporal dynamic config..."
$SCP temporal/dynamicconfig/development.yaml "root@$SERVER:$DATA_DIR/configs/temporal/dynamicconfig/"

# Vespa
log "Vespa application..."
$SCP -r packages/vespa/application "root@$SERVER:$DATA_DIR/configs/vespa-application"

log "Config sync complete."
log "Restart affected containers if needed:"
log "  ssh root@$SERVER 'docker restart openplane-prometheus openplane-grafana openplane-loki openplane-promtail'"
