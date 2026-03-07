#!/bin/bash

# Test Slack sync flow
# Usage: ./scripts/test-slack-sync.sh <CONNECTOR_ID> [SERVER_URL]
# Requires: OPENBEAM_API_KEY environment variable

set -e

CONNECTOR_ID="${1:-}"
SERVER_URL="${2:-http://localhost:3000}"
API_KEY="${OPENBEAM_API_KEY:-}"

if [ -z "$CONNECTOR_ID" ]; then
  echo "Usage: $0 <CONNECTOR_ID> [SERVER_URL]"
  echo "Get connector ID: psql \$DATABASE_URL -c \"SELECT id FROM connector WHERE app = 'SLACK';\""
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: OPENBEAM_API_KEY environment variable required"
  echo "Set it with: export OPENBEAM_API_KEY='op_xxx'"
  exit 1
fi

echo "Testing sync for connector: $CONNECTOR_ID"
echo ""

# Trigger sync
echo "Triggering sync..."
SYNC_RESPONSE=$(curl -s -X POST "${SERVER_URL}/api/v1/connectors/${CONNECTOR_ID}/sync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"type": "FULL"}')

if echo "$SYNC_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "Sync queued successfully"
  SYNC_JOB_ID=$(echo "$SYNC_RESPONSE" | jq -r '.syncJobId')
  echo "   Job ID: $SYNC_JOB_ID"
else
  echo "Failed: $SYNC_RESPONSE"
  exit 1
fi

# Wait and check status
echo ""
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "Sync status:"
curl -s -H "Authorization: Bearer ${API_KEY}" \
  "${SERVER_URL}/api/v1/connectors/${CONNECTOR_ID}/sync-status" | jq '.' 2>/dev/null || echo "Check worker logs"

echo ""
echo "Next: Watch worker logs and check indexed_document table"
