#!/usr/bin/env bash

set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE="${MONITORING_SMOKE_MODE:-full}"
STRICT="${MONITORING_SMOKE_STRICT:-}"

if [[ "$MODE" != "full" && "$MODE" != "infra" ]]; then
  echo "Invalid MONITORING_SMOKE_MODE: $MODE (expected: full|infra)"
  exit 1
fi

if [[ -z "$STRICT" ]]; then
  if [[ "$MODE" == "full" ]]; then
    STRICT=1
  else
    STRICT=0
  fi
fi

PASSED=0
FAILED=0
WARNINGS=0

mark_issue() {
  local message=$1
  local required=${2:-1}

  if [[ "$required" -eq 1 && "$STRICT" -eq 1 ]]; then
    echo -e "${RED}✗${NC} $message"
    ((FAILED++))
  else
    echo -e "${YELLOW}⚠${NC} $message"
    ((WARNINGS++))
  fi
}

mark_pass() {
  local message=$1
  echo -e "${GREEN}✓${NC} $message"
  ((PASSED++))
}

check_service() {
  local url=$1
  local name=$2
  local required=${3:-1}

  if curl -sf --max-time 10 "$url" >/dev/null 2>&1; then
    mark_pass "$name"
  else
    mark_issue "$name" "$required"
  fi
}

check_metric() {
  local metric=$1
  local endpoint=$2
  local required=${3:-1}

  local metrics
  metrics=$(curl -s --max-time 10 "$endpoint" 2>/dev/null || true)

  if [[ -z "$metrics" ]]; then
    mark_issue "$metric (endpoint unreachable: $endpoint)" "$required"
    return
  fi

  if echo "$metrics" | grep -qE "^${metric}([\{ ]|$)" || \
    echo "$metrics" | grep -q "# HELP ${metric} "; then
    mark_pass "$metric"
  else
    mark_issue "$metric" "$required"
  fi
}

check_loki_query() {
  local required=${1:-0}
  local query='count_over_time({service=~".+"}[5m])'

  local response
  response=$(curl -sG --max-time 10 "http://localhost:3100/loki/api/v1/query" \
    --data-urlencode "query=${query}" 2>/dev/null || true)

  if [[ "$response" != *'"status":"success"'* ]]; then
    mark_issue "Loki smoke query execution" "$required"
    return
  fi

  if echo "$response" | grep -q '"result":\[\]'; then
    mark_issue "Loki smoke query returned no streams" 0
  else
    mark_pass "Loki smoke query returned streams"
  fi
}

check_prometheus_query_metric() {
  local query=$1
  local name=$2
  local required=${3:-1}

  local response
  response=$(curl -sG --max-time 10 "http://localhost:9090/api/v1/query" \
    --data-urlencode "query=${query}" 2>/dev/null || true)

  if [[ "$response" != *'"status":"success"'* ]]; then
    mark_issue "$name (Prometheus query failed)" "$required"
    return
  fi

  if echo "$response" | grep -q '"result":\[\]'; then
    mark_issue "$name (no series)" "$required"
  else
    mark_pass "$name"
  fi
}

print_section() {
  echo ""
  echo -e "$1"
}

echo "Testing monitoring setup..."
echo "Mode: $MODE (strict=$STRICT)"

print_section "Infrastructure:"
check_service "http://localhost:9090/-/healthy" "Prometheus"
check_service "http://localhost:3100/ready" "Loki"
check_service "http://localhost:3002/api/health" "Grafana"

print_section "Prometheus targets:"
TARGETS=$(curl -s --max-time 10 "http://localhost:9090/api/v1/targets" 2>/dev/null || echo "{}")
UP=$(echo "$TARGETS" | grep -o '"health":"up"' | wc -l | tr -d ' ')
TOTAL=$(echo "$TARGETS" | grep -o '"health":' | wc -l | tr -d ' ')
echo "  $UP/$TOTAL up"

if [[ "$TOTAL" -eq 0 ]]; then
  mark_issue "No Prometheus targets discovered" 1
elif [[ "$UP" -eq 0 ]]; then
  mark_issue "No healthy Prometheus targets" 1
else
  mark_pass "Prometheus has healthy targets"
fi

if [[ "$MODE" == "full" ]]; then
  print_section "Server metrics:"
  check_metric "http_request_duration_seconds" "http://localhost:3000/metrics" 1
  check_metric "search_queries_total" "http://localhost:3000/metrics" 1
  check_metric "documents_indexed_total" "http://localhost:3000/metrics" 1

  print_section "Worker metrics:"
  check_metric "sync_jobs_total" "http://localhost:9091/metrics" 1
  check_metric "index_jobs_total" "http://localhost:9091/metrics" 1
  check_metric "sync_queue_depth" "http://localhost:9091/metrics" 1

  print_section "Engine metrics:"
  check_metric "engine_http_requests_total" "http://localhost:8000/metrics" 0

  print_section "Generating workload:"
  for i in {1..5}; do
    curl -s "http://localhost:3000/api/v1/search?q=test$i" >/dev/null 2>&1 || true
  done
  sleep 2
else
  print_section "Infra exporter metrics:"
  check_metric "redis_memory_used_bytes" "http://localhost:9121/metrics" 0
  check_metric "vespa_content_proton_documentdb_indexed_docs" "http://localhost:9116/metrics" 0

  print_section "Infra observability metrics in Prometheus:"
  check_prometheus_query_metric "loki_build_info" "loki_build_info visible in Prometheus" 1
  check_prometheus_query_metric "promtail_build_info" "promtail_build_info visible in Prometheus" 1
fi

print_section "Loki checks:"
LABELS=$(curl -s --max-time 10 "http://localhost:3100/loki/api/v1/labels" 2>/dev/null || echo "{}")
if echo "$LABELS" | grep -q '"service"'; then
  mark_pass "Loki service label available"
else
  mark_issue "Loki service label not available yet" 0
fi

if [[ "$MODE" == "full" ]]; then
  check_loki_query 1
else
  check_loki_query 0
fi

print_section "Prometheus query checks:"
if [[ "$MODE" == "full" ]]; then
  if curl -s --max-time 10 'http://localhost:9090/api/v1/query?query=search_queries_total' | grep -q '"result":\['; then
    mark_pass "search_queries_total visible in Prometheus"
  else
    mark_issue "search_queries_total visible in Prometheus" 1
  fi
else
  if curl -s --max-time 10 'http://localhost:9090/api/v1/query?query=up' | grep -q '"status":"success"'; then
    mark_pass "Prometheus query API responding"
  else
    mark_issue "Prometheus query API responding" 1
  fi
fi

print_section "Summary: ${GREEN}$PASSED passed${NC}, ${YELLOW}$WARNINGS warnings${NC}, ${RED}$FAILED failed${NC}"

if [[ "$FAILED" -eq 0 ]]; then
  exit 0
fi

exit 1
