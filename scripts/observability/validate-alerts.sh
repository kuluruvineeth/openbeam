#!/usr/bin/env bash
set -euo pipefail

ALERTS_FILE="monitoring/prometheus/alerts.yml"
RECORDING_FILE="monitoring/prometheus/recording-rules.yml"

if [[ ! -f "$ALERTS_FILE" ]]; then
  echo "ERROR: Missing $ALERTS_FILE"
  exit 1
fi

if [[ ! -f "$RECORDING_FILE" ]]; then
  echo "ERROR: Missing $RECORDING_FILE"
  exit 1
fi

validate_alert_annotations() {
  local current_alert=""
  local has_summary=0
  local has_impact=0
  local has_runbook=0
  local has_owner=0
  local has_severity=0
  local error_count=0

  check_current_alert() {
    if [[ -z "$current_alert" ]]; then
      return
    fi

    if [[ $has_summary -eq 0 || $has_impact -eq 0 || $has_runbook -eq 0 || $has_owner -eq 0 ]]; then
      echo "ERROR: Alert '$current_alert' is missing one or more required annotations (summary, impact, runbook_url, owner)."
      error_count=$((error_count + 1))
    fi

    if [[ $has_severity -eq 0 ]]; then
      echo "ERROR: Alert '$current_alert' is missing required severity label (critical|warning)."
      error_count=$((error_count + 1))
    fi
  }

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" =~ ^[[:space:]]*-[[:space:]]alert:[[:space:]]*([A-Za-z0-9:_-]+)[[:space:]]*$ ]]; then
      check_current_alert
      current_alert="${BASH_REMATCH[1]}"
      has_summary=0
      has_impact=0
      has_runbook=0
      has_owner=0
      has_severity=0
      continue
    fi

    if [[ -z "$current_alert" ]]; then
      continue
    fi

    if [[ "$line" =~ ^[[:space:]]*summary:[[:space:]] ]]; then
      has_summary=1
    elif [[ "$line" =~ ^[[:space:]]*impact:[[:space:]] ]]; then
      has_impact=1
    elif [[ "$line" =~ ^[[:space:]]*runbook_url:[[:space:]] ]]; then
      has_runbook=1
    elif [[ "$line" =~ ^[[:space:]]*owner:[[:space:]] ]]; then
      has_owner=1
    elif [[ "$line" =~ ^[[:space:]]*severity:[[:space:]]*(critical|warning)[[:space:]]*$ ]]; then
      has_severity=1
    fi
  done <"$ALERTS_FILE"

  check_current_alert

  if [[ $error_count -gt 0 ]]; then
    echo "ERROR: Alert annotation validation failed with $error_count issue(s)."
    exit 1
  fi

  echo "Alert annotation contract validation passed."
}

run_promtool_check() {
  if command -v promtool >/dev/null 2>&1; then
    promtool check rules "$ALERTS_FILE" "$RECORDING_FILE"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm \
      --entrypoint promtool \
      -v "$PWD/monitoring/prometheus:/etc/prometheus" \
      prom/prometheus:v2.53.3 \
      check rules /etc/prometheus/alerts.yml /etc/prometheus/recording-rules.yml
    return
  fi

  echo "ERROR: promtool not found and docker unavailable."
  exit 1
}

validate_alert_annotations
run_promtool_check

echo "Prometheus alert/rule validation passed."
