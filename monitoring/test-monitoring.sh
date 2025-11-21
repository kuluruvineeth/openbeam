#!/bin/bash

# Test script for OpenPlane monitoring setup
# Verifies Prometheus and Grafana are working correctly

set -e

echo "Testing OpenPlane Monitoring Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if services are running
check_service() {
    local service=$1
    local port=$2
    local url=$3
    
    echo -n "Checking $service... "
    if curl -sf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}✗ Not accessible${NC}"
        return 1
    fi
}

# Test Prometheus
echo "Prometheus"
echo "----------"
check_service "Prometheus" "9090" "http://localhost:9090/-/healthy" || exit 1

# Check Prometheus targets
echo -n "Checking Prometheus targets... "
TARGETS=$(curl -s "http://localhost:9090/api/v1/targets" 2>/dev/null | grep -o '"health":"up"' | wc -l || echo "0")
if [ "$TARGETS" -gt "0" ]; then
    echo -e "${GREEN}✓ $TARGETS target(s) up${NC}"
else
    echo -e "${YELLOW}⚠ No targets found (Vespa might not be running)${NC}"
fi

# Check if Vespa metrics are being scraped
echo -n "Checking Vespa metrics endpoint... "
VESPA_METRICS=$(curl -s "http://localhost:9090/api/v1/query?query=vespa_content_proton_resource_usage_disk_usage_ratio" 2>/dev/null | grep -o '"result":\[' | wc -l || echo "0")
if [ "$VESPA_METRICS" -gt "0" ]; then
    echo -e "${GREEN}✓ Vespa metrics found${NC}"
else
    echo -e "${YELLOW}⚠ Vespa metrics not found (Vespa might not be running or metrics not available yet)${NC}"
fi

echo ""

# Test Grafana
echo "Grafana"
echo "-------"
check_service "Grafana" "3002" "http://localhost:3002/api/health" || exit 1

# Check Grafana data source
echo -n "Checking Grafana data source... "
GRAFANA_DS=$(curl -s -u admin:admin "http://localhost:3002/api/datasources" 2>/dev/null | grep -o '"name":"Prometheus"' | wc -l || echo "0")
if [ "$GRAFANA_DS" -gt "0" ]; then
    echo -e "${GREEN}✓ Prometheus data source configured${NC}"
else
    echo -e "${YELLOW}⚠ Prometheus data source not found${NC}"
fi

# Check Grafana dashboards
echo -n "Checking Grafana dashboards... "
DASHBOARDS=$(curl -s -u admin:admin "http://localhost:3002/api/search?query=openplane" 2>/dev/null | grep -o '"title":"OpenPlane Command Center"' | wc -l || echo "0")
if [ "$DASHBOARDS" -gt "0" ]; then
    echo -e "${GREEN}✓ Command Center dashboard found${NC}"
else
    echo -e "${YELLOW}⚠ Command Center dashboard not found${NC}"
fi

echo ""
echo "API Metrics"
echo "-----------"
echo -n "Checking server /metrics endpoint... "
if curl -sf "http://localhost:3000/metrics" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Metrics endpoint reachable${NC}"
else
    echo -e "${RED}✗ Unable to reach server metrics endpoint${NC}"
fi

echo -n "Validating custom metrics... "
METRICS_PAYLOAD=$(curl -s "http://localhost:3000/metrics" 2>/dev/null || echo "")
if echo "$METRICS_PAYLOAD" | grep -q "search_queries_total"; then
    echo -e "${GREEN}✓ search_queries_total exposed${NC}"
else
    echo -e "${YELLOW}⚠ search_queries_total missing${NC}"
fi

echo ""
echo "Monitoring test complete."
echo "Next steps:"
echo "  1. Grafana: http://localhost:3002 (admin/admin)"
echo "  2. Prometheus: http://localhost:9090"
echo "  3. Targets: http://localhost:9090/targets"
echo "  4. Dashboard: OpenPlane Command Center"
echo ""

