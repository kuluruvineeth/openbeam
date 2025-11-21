#!/bin/bash

# Quick test for Vespa metrics availability

echo "Testing Vespa metrics"
echo "---------------------"
echo ""

# Test Vespa health
echo "1. Vespa health:"
curl -s "http://localhost:19071/state/v1/health" | jq -r '.status.code' 2>/dev/null || echo "Vespa not accessible"
echo ""

# Test Vespa metrics endpoint
echo "2. Vespa metrics endpoint:"
METRICS_COUNT=$(curl -s "http://localhost:19071/state/v1/metrics" | jq '.metrics.values | length' 2>/dev/null || echo "0")
echo "   Found $METRICS_COUNT metrics"
echo ""

# Show sample metrics
echo "3. Sample metrics:"
curl -s "http://localhost:19071/state/v1/metrics" | jq -r '.metrics.values[0:5] | .[] | "   \(.name): \(.values.last // .values.average)"' 2>/dev/null || echo "   Unable to parse metrics"
echo ""

echo "Test complete."
echo "Vespa exposes JSON metrics; Prometheus scrapes them via the JSON exporter."
