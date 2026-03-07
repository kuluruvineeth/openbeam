# OpenBeam Server

Public API server with authentication, search, and connector management.

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Run development server
bun run dev

# Build for production
bun run build
```

## API Testing

### Authentication

The server supports two authentication methods:

1. **Session Cookies** (Web UI)
2. **API Keys** (Public API)

### API Key Authentication

API keys use the standard `Authorization: Bearer` header:

```bash
curl -H "Authorization: Bearer op_live_xxx" \
  "http://localhost:3000/api/v1/search?q=test"
```

**Key Format**: `op_live_<random>` or `op_test_<random>`

### Scopes

API keys use fine-grained scopes:

- `connectors:read` - View connector status and history
- `connectors:write` - Pause/resume connectors
- `connectors:sync` - Trigger sync jobs
- `search:read` - Search indexed documents

### Example Requests

#### Search Documents

```bash
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://localhost:3000/api/v1/search?q=quarterly+report&limit=10"
```

#### Trigger Connector Sync

```bash
curl -X POST \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/v1/connectors/${CONNECTOR_ID}/sync" \
  -d '{"type": "FULL"}'
```

#### Get Sync Status

```bash
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://localhost:3000/api/v1/connectors/${CONNECTOR_ID}/sync-status"
```

#### Search History

```bash
curl -H "Authorization: Bearer ${API_KEY}" \
  "http://localhost:3000/api/v1/connectors/${CONNECTOR_ID}/sync-history?limit=20"
```

### Error Responses

**401 Unauthorized** - Missing or invalid API key

```json
{
  "error": "Unauthorized",
  "message": "Valid API key or session required. Use 'Authorization: Bearer op_xxx' header."
}
```

**403 Forbidden** - Insufficient scopes

```json
{
  "error": "Forbidden",
  "message": "Required scopes: connectors:sync",
  "requiredScopes": ["connectors:sync"]
}
```

## Architecture

- **Framework**: Hono (fast web framework)
- **Authentication**: Better Auth + API Keys with Argon2
- **Database**: PostgreSQL via Prisma
- **Search**: Vespa
- **Queue**: Redis + BullMQ
- **Monitoring**: Prometheus metrics

## Endpoints

### Public API (v1)

- `GET /api/v1/search` - Search documents
- `GET /api/v1/search/autocomplete` - Autocomplete suggestions
- `GET /api/v1/search/recent` - Recent documents
- `GET /api/v1/search/thread/:threadId` - Thread messages
- `GET /api/v1/search/similar/:documentId` - Similar documents
- `POST /api/v1/connectors/:id/sync` - Trigger sync
- `GET /api/v1/connectors/:id/sync-status` - Sync status
- `GET /api/v1/connectors/:id/sync-history` - Sync history
- `POST /api/v1/connectors/:id/pause` - Pause connector
- `POST /api/v1/connectors/:id/resume` - Resume connector

### Internal

- `GET /metrics` - Prometheus metrics
- `/api/auth/*` - Better Auth endpoints
- `/trpc/*` - tRPC API for web UI

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3001

# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Vespa
VESPA_URL=http://localhost:8080

# Auth
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Development

```bash
# Type check
bun run type-check

# Lint
bun run lint

# Format
bun run format
```

## Testing

See [TESTING_SLACK.md](../../TESTING_SLACK.md) for end-to-end testing guide.

