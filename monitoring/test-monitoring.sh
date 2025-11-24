#!/usr/bin/env bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

check_service() {
    local url=$1
    local name=$2
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name"
        ((FAILED++))
    fi
}

check_metric() {
    local metric=$1
    local endpoint=$2
    
    METRICS=$(curl -s "$endpoint" 2>/dev/null || echo "")
    if echo "$METRICS" | grep -q "^${metric}[{ ]" || echo "$METRICS" | grep -q "# HELP ${metric} "; then
        echo -e "  ${GREEN}✓${NC} $metric"
        ((PASSED++))
    else
        echo -e "  ${YELLOW}⚠${NC} $metric"
        ((WARNINGS++))
    fi
}

echo "Testing monitoring setup..."
echo ""

echo "Infrastructure:"
check_service "http://localhost:9090/-/healthy" "Prometheus"
check_service "http://localhost:16686" "Jaeger"
check_service "http://localhost:3002/api/health" "Grafana"

echo ""
echo "Prometheus targets:"
TARGETS=$(curl -s "http://localhost:9090/api/v1/targets" 2>/dev/null || echo "{}")
UP=$(echo "$TARGETS" | grep -o '"health":"up"' | wc -l | tr -d ' ')
TOTAL=$(echo "$TARGETS" | grep -o '"health":' | wc -l | tr -d ' ')
echo "  $UP/$TOTAL up"

echo ""
echo "Server metrics:"
if curl -sf "http://localhost:3000/metrics" > /dev/null 2>&1; then
    check_metric "http_request_duration_seconds" "http://localhost:3000/metrics"
    check_metric "search_queries_total" "http://localhost:3000/metrics"
    check_metric "documents_indexed_total" "http://localhost:3000/metrics"
else
    echo -e "  ${RED}✗${NC} Endpoint unreachable"
    ((FAILED++))
fi

echo ""
echo "Worker metrics:"
if curl -sf "http://localhost:9091/metrics" > /dev/null 2>&1; then
    check_metric "sync_jobs_total" "http://localhost:9091/metrics"
    check_metric "index_jobs_total" "http://localhost:9091/metrics"
    check_metric "sync_queue_depth" "http://localhost:9091/metrics"
else
    echo -e "  ${RED}✗${NC} Endpoint unreachable"
    ((FAILED++))
fi

echo ""
echo "Redis metrics:"
if curl -sf "http://localhost:9121/metrics" > /dev/null 2>&1; then
    check_metric "redis_memory_used_bytes" "http://localhost:9121/metrics"
    check_metric "redis_connected_clients" "http://localhost:9121/metrics"
else
    echo -e "  ${RED}✗${NC} Exporter unreachable"
    ((FAILED++))
fi

echo ""
echo "Vespa metrics:"
if curl -sf "http://localhost:9116/metrics" > /dev/null 2>&1; then
    check_metric "vespa_content_proton_documentdb_indexed_docs" "http://localhost:9116/metrics"
else
    echo -e "  ${RED}✗${NC} Exporter unreachable"
    ((FAILED++))
fi

echo ""
echo "Jaeger services:"
SERVICES=$(curl -s "http://localhost:16686/api/services" 2>/dev/null || echo "[]")
if echo "$SERVICES" | grep -q "openplane-server"; then
    echo -e "  ${GREEN}✓${NC} openplane-server"
else
    echo -e "  ${YELLOW}⚠${NC} No traces yet"
fi

echo ""
echo "Generating workload..."
for i in {1..5}; do
    curl -s "http://localhost:3000/api/v1/search?q=test$i" > /dev/null 2>&1 || true
done
sleep 2

echo ""
echo "End-to-end checks:"
if curl -s 'http://localhost:9090/api/v1/targets' | grep -q '"health":"up"'; then
    echo -e "  ${GREEN}✓${NC} Prometheus scraping"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Prometheus scraping"
    ((WARNINGS++))
fi

if curl -s 'http://localhost:9090/api/v1/query?query=search_queries_total' | grep -q '"result":\['; then
    echo -e "  ${GREEN}✓${NC} Metrics in Prometheus"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC} Metrics in Prometheus"
    ((WARNINGS++))
fi

echo ""
echo "Summary: ${GREEN}$PASSED passed${NC}, ${YELLOW}$WARNINGS warnings${NC}, ${RED}$FAILED failed${NC}"

if [ "$FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi
