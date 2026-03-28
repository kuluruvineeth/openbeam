# @openbeam/mcp-server

Enterprise knowledge MCP server for Claude, Cursor, Windsurf, Codex, and any MCP-compatible AI host.

103+ enterprise connectors. Hybrid search. RAG answers. Agent execution. All via MCP.

## Quick Start

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openbeam": {
      "command": "npx",
      "args": ["@openbeam/mcp-server"],
      "env": {
        "MCP_API_KEY": "your-api-key",
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "openbeam": {
      "command": "npx",
      "args": ["@openbeam/mcp-server"],
      "env": {
        "MCP_API_KEY": "your-api-key",
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add openbeam npx @openbeam/mcp-server
```

### Windsurf / Codex / Any MCP Host

Use stdio transport:

```bash
npx @openbeam/mcp-server
```

Environment variables:

- `MCP_API_KEY` — API key for authentication
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (optional, for rate limiting)
- `VESPA_URL` — Vespa search endpoint

## Available Tools

| Tool | Description |
|------|-------------|
| `search_documents` | Hybrid semantic + keyword search across 103+ connectors |
| `search_people` | Find experts by name, email, department, or expertise |
| `get_document` | Retrieve full document content by ID |
| `get_related` | Find related documents by semantic similarity or graph |
| `ask_question` | RAG-powered Q&A with citations |
| `run_agent` | Start an autonomous agent (async, returns job_id) |
| `deep_research` | Multi-step research pipeline (async, returns job_id) |
| `get_job_status` | Check status of async agent/research jobs |
| `list_connectors` | List connected data sources |
| `get_connector_stats` | Get sync statistics for a connector |

## Available Resources

| URI Pattern | Description |
|-------------|-------------|
| `openbeam://resources/{teamId}/` | Synced enterprise documents |
| `openbeam://user/{teamId}/{userId}/memories/` | User knowledge and preferences |
| `openbeam://agent/{teamId}/{agentId}/skills/` | Agent capabilities |
| `openbeam://tools/{teamId}/` | Tool definitions and stats |

## Authentication

Three modes (checked in order):

1. **API Key** — Set `MCP_API_KEY` environment variable
2. **Bearer Token** — Set `MCP_TOKEN` environment variable
3. **Environment** — Set `MCP_TEAM_ID` + `MCP_USER_ID` (local dev only)
