#!/usr/bin/env bash
set -euo pipefail

# OpenPlane Server Bootstrap Script
# Run once on a fresh Hetzner server to prepare it for Coolify deployments.
#
# Usage:
#   ssh root@<SERVER_IP> 'bash -s' < scripts/deploy/bootstrap.sh
#
# Or copy to server and run:
#   scp scripts/deploy/bootstrap.sh root@<SERVER_IP>:/tmp/
#   ssh root@<SERVER_IP> 'bash /tmp/bootstrap.sh'
#
# Prerequisites:
#   - Ubuntu 24.04 LTS
#   - Hetzner Volume mounted (auto-detected)
#   - Root access

REPO_URL="${OPENPLANE_REPO:-https://github.com/kuluruvineeth/openplane.git}"
REPO_BRANCH="${OPENPLANE_BRANCH:-dev}"
DATA_DIR="/mnt/openplane-data"
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o StrictHostKeyChecking=accept-new}"

log() { printf '\033[1;32m[bootstrap]\033[0m %s\n' "$1"; }
warn() { printf '\033[1;33m[bootstrap]\033[0m %s\n' "$1"; }
die() { printf '\033[1;31m[bootstrap]\033[0m %s\n' "$1" >&2; exit 1; }

# ── Step 1: Detect Hetzner Volume ──────────────────────────────────────────────

log "Detecting Hetzner Volume..."
VOLUME_PATH=$(mount | grep '/mnt/HC_Volume' | awk '{print $3}' | head -1)

if [[ -z "$VOLUME_PATH" ]]; then
  die "No Hetzner Volume found. Attach a volume in Hetzner Console first."
fi

log "Found volume at $VOLUME_PATH"

if [[ ! -L "$DATA_DIR" && ! -d "$DATA_DIR" ]]; then
  ln -s "$VOLUME_PATH" "$DATA_DIR"
  log "Symlinked $VOLUME_PATH -> $DATA_DIR"
elif [[ -L "$DATA_DIR" ]]; then
  log "Symlink $DATA_DIR already exists"
else
  warn "$DATA_DIR exists as a directory (not symlink). Using as-is."
fi

# ── Step 2: Create data directories ───────────────────────────────────────────

log "Creating data directories..."
mkdir -p "$DATA_DIR"/{postgres,redis,vespa,minio,prometheus,grafana,loki}

# ── Step 3: Set ownership ─────────────────────────────────────────────────────

log "Setting directory ownership..."
chown -R 70:70    "$DATA_DIR/postgres"     # PostgreSQL alpine
chown -R 999:999  "$DATA_DIR/redis"        # Redis
chown -R 1000:1000 "$DATA_DIR/vespa"       # Vespa
chown -R 1000:1000 "$DATA_DIR/minio"       # MinIO
chown -R 65534:65534 "$DATA_DIR/prometheus" # Prometheus (nobody)
chown -R 472:472  "$DATA_DIR/grafana"      # Grafana
chown -R 10001:10001 "$DATA_DIR/loki"      # Loki

# ── Step 4: Kernel tuning ─────────────────────────────────────────────────────

log "Setting kernel parameters..."
sysctl -w vm.max_map_count=262144
grep -q 'vm.max_map_count=262144' /etc/sysctl.conf || \
  echo "vm.max_map_count=262144" >> /etc/sysctl.conf

sysctl -w fs.file-max=1048576
grep -q 'fs.file-max=1048576' /etc/sysctl.conf || \
  echo "fs.file-max=1048576" >> /etc/sysctl.conf

# ── Step 5: Create config directories ─────────────────────────────────────────

log "Creating config directories..."
mkdir -p "$DATA_DIR/configs/prometheus"
mkdir -p "$DATA_DIR/configs/grafana/provisioning/datasources"
mkdir -p "$DATA_DIR/configs/grafana/provisioning/dashboards"
mkdir -p "$DATA_DIR/configs/grafana/dashboards"
mkdir -p "$DATA_DIR/configs/loki"
mkdir -p "$DATA_DIR/configs/promtail"
mkdir -p "$DATA_DIR/configs/temporal/dynamicconfig"
mkdir -p "$DATA_DIR/configs/postgres"

# ── Step 6: Clone repo and copy config files ──────────────────────────────────

log "Cloning OpenPlane repository..."
CLONE_DIR=$(mktemp -d)
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$CLONE_DIR" 2>&1 | tail -1

copy_config() {
  local src="$1" dst="$2"
  if [[ -e "$src" ]]; then
    # Remove destination if Docker created it as a directory
    if [[ -d "$dst" && ! -d "$src" ]]; then
      rm -rf "$dst"
    fi
    cp -r "$src" "$dst"
  else
    warn "Source not found: $src (skipping)"
  fi
}

log "Copying Prometheus configs..."
copy_config "$CLONE_DIR/monitoring/prometheus/prometheus.yml" "$DATA_DIR/configs/prometheus/prometheus.yml"
copy_config "$CLONE_DIR/monitoring/prometheus/alerts.yml" "$DATA_DIR/configs/prometheus/alerts.yml"
copy_config "$CLONE_DIR/monitoring/prometheus/recording-rules.yml" "$DATA_DIR/configs/prometheus/recording-rules.yml"
copy_config "$CLONE_DIR/monitoring/prometheus/vespa-exporter.yml" "$DATA_DIR/configs/prometheus/vespa-exporter.yml"

log "Copying Grafana configs..."
copy_config "$CLONE_DIR/monitoring/grafana/provisioning/datasources/datasource.yml" "$DATA_DIR/configs/grafana/provisioning/datasources/datasource.yml"
copy_config "$CLONE_DIR/monitoring/grafana/provisioning/dashboards/dashboard.yml" "$DATA_DIR/configs/grafana/provisioning/dashboards/dashboard.yml"

if [[ -d "$CLONE_DIR/monitoring/grafana/dashboards" ]]; then
  cp -r "$CLONE_DIR/monitoring/grafana/dashboards/"* "$DATA_DIR/configs/grafana/dashboards/" 2>/dev/null || true
fi

log "Copying Loki config..."
copy_config "$CLONE_DIR/monitoring/loki/loki-config.yml" "$DATA_DIR/configs/loki/loki-config.yml"

log "Copying Promtail config..."
copy_config "$CLONE_DIR/monitoring/promtail/promtail-config.yml" "$DATA_DIR/configs/promtail/promtail-config.yml"

log "Copying Temporal dynamic config..."
copy_config "$CLONE_DIR/temporal/dynamicconfig/development.yaml" "$DATA_DIR/configs/temporal/dynamicconfig/development.yaml"

log "Copying Vespa application..."
if [[ -d "$CLONE_DIR/packages/vespa/application" ]]; then
  cp -r "$CLONE_DIR/packages/vespa/application" "$DATA_DIR/configs/vespa-application"
  [[ -f "$CLONE_DIR/packages/vespa/deploy.sh" ]] && cp "$CLONE_DIR/packages/vespa/deploy.sh" "$DATA_DIR/configs/vespa-application/"
fi

rm -rf "$CLONE_DIR"

# ── Step 7: Verify all config files ───────────────────────────────────────────

log "Verifying config files..."
MISSING=0
for f in \
  "$DATA_DIR/configs/loki/loki-config.yml" \
  "$DATA_DIR/configs/promtail/promtail-config.yml" \
  "$DATA_DIR/configs/prometheus/prometheus.yml" \
  "$DATA_DIR/configs/grafana/provisioning/datasources/datasource.yml" \
  "$DATA_DIR/configs/grafana/provisioning/dashboards/dashboard.yml" \
  "$DATA_DIR/configs/temporal/dynamicconfig/development.yaml"
do
  if [[ -f "$f" ]]; then
    printf '  ✓ %s\n' "$f"
  else
    printf '  ✗ MISSING: %s\n' "$f"
    MISSING=$((MISSING + 1))
  fi
done

if [[ $MISSING -gt 0 ]]; then
  die "$MISSING config file(s) missing. Fix before deploying."
fi

# ── Step 8: PostgreSQL custom config ──────────────────────────────────────────

log "Writing PostgreSQL tuning config..."
[[ -d "$DATA_DIR/configs/postgres/custom.conf" ]] && rm -rf "$DATA_DIR/configs/postgres/custom.conf"
cat > "$DATA_DIR/configs/postgres/custom.conf" <<'PGCONF'
# Tuned for CX43 (16GB host, 2GB container limit)
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
work_mem = 8MB
max_connections = 100
wal_buffers = 16MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
max_wal_size = 1GB
min_wal_size = 80MB
log_min_duration_statement = 1000
PGCONF

# ── Done ──────────────────────────────────────────────────────────────────────

log ""
log "Bootstrap complete. Server is ready for Coolify deployment."
log ""
log "Summary:"
log "  Data directory:  $DATA_DIR"
log "  Volume:          $VOLUME_PATH"
log "  vm.max_map_count: $(sysctl -n vm.max_map_count)"
log "  Config files:    all present"
log ""
log "Next: Deploy via Coolify UI or run coolify-setup.sh"
