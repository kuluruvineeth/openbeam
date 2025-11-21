# Testing Slack Ingestion

## Prerequisites

1. **Slack Connector**: Create via web UI at `http://localhost:3001/integrations`
2. **API Key**: Generate via API or database
3. **Services Running**:
   ```bash
   docker compose up postgres redis vespa
   cd apps/server && bun run dev
   cd apps/worker && bun run dev
   ```

## Quick Test

```bash
# Get connector ID
psql $DATABASE_URL -c "SELECT id, name FROM connector WHERE app = 'SLACK';"

# Run test script (requires API key)
export OPENPLANE_API_KEY="op_xxx"
./scripts/test-slack-sync.sh <CONNECTOR_ID>
```

## API Key Authentication

API keys use the standard `Authorization: Bearer` header format:

```bash
curl -H "Authorization: Bearer op_xxx" \
  "http://localhost:3000/api/v1/connectors"
```

**Key Format**: `op_<prefix><random>` (e.g., `op_abc1234def5678...`)

## Manual Testing

### 1. Trigger Sync

```bash
CONNECTOR_ID="your-connector-id"
API_KEY="op_xxx"

curl -X POST "http://localhost:3000/api/v1/connectors/${CONNECTOR_ID}/sync" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"type": "FULL"}'
```

### 2. Check Status

```bash
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://localhost:3000/api/v1/connectors/${CONNECTOR_ID}/sync-status"
```

### 3. Verify Indexed Documents

```bash
# Database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM indexed_document WHERE connector_id = '${CONNECTOR_ID}';"

# Search
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://localhost:3000/api/v1/search?q=test&organization_id=YOUR_ORG_ID"
```

## Troubleshooting

- **Sync not starting**: Check worker logs and Redis connection
- **No documents**: Verify Slack OAuth credentials and bot scopes
- **Search empty**: Confirm Vespa is running and app is deployed
- **401 Unauthorized**: Verify API key is valid and not revoked

## Flow

```
API → Redis Queue → Worker → Slack API → Index Queue → Vespa → Search
```
