#!/usr/bin/env bash
set -e

MAX_RETRIES=60
RETRY_INTERVAL=2

wait_for_service() {
    local name=$1
    local check_cmd=$2
    local retries=0
    printf "  %-20s " "$name"
    while [ $retries -lt $MAX_RETRIES ]; do
        if eval "$check_cmd" > /dev/null 2>&1; then
            echo "✓"
            return 0
        fi
        retries=$((retries + 1))
        sleep $RETRY_INTERVAL
    done
    echo "✗"
    return 1
}

echo "Waiting for services..."
echo ""

FAILED=0
wait_for_service "PostgreSQL" "nc -z localhost 5432" || FAILED=1
wait_for_service "Redis" "nc -z localhost 6379" || FAILED=1
wait_for_service "Vespa" "curl -sf http://localhost:19071/state/v1/health" || FAILED=1
wait_for_service "Temporal" "nc -z localhost 7233" || FAILED=1
wait_for_service "Temporal UI" "curl -sf http://localhost:8233" || FAILED=1
wait_for_service "MinIO" "curl -sf http://localhost:9000/minio/health/live" || FAILED=1

echo ""
[ $FAILED -eq 0 ] && echo "All services ready." || exit 1
