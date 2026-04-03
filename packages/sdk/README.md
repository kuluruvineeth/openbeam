# @openbeam/sdk

TypeScript SDK for the [OpenBeam](https://openbeam.work) enterprise search and AI platform.

Search across 103+ connectors, query the knowledge graph, run AI agents, and manage sync operations — all from a single client.

## Install

```bash
npm i @openbeam/sdk
```

## Quick Start

```typescript
import OpenBeam from "@openbeam/sdk";

const ob = new OpenBeam({ apiKey: "op_live_..." });

// Search across all connected data sources
const results = await ob.search.documents("quarterly revenue report");
console.log(results.data);

// Ask a question with RAG-powered citations
const answer = await ob.agents.ask("Who owns the authentication service?");
console.log(answer.data.answer, answer.data.citations);
```

## Configuration

```typescript
const ob = new OpenBeam({
  apiKey: "op_live_...",         // Required — from Settings > API Keys
  baseUrl: "https://api.openbeam.work", // Optional — custom endpoint
  timeout: 30_000,              // Optional — request timeout in ms (default: 30s)
  maxRetries: 2,                // Optional — retry count for transient errors (default: 2)
});
```

## Resources

### Search

```typescript
// Hybrid semantic + keyword search
const results = await ob.search.documents("deployment runbook", {
  limit: 20,
  connectorTypes: ["NOTION", "CONFLUENCE"],
  ranking: "hybrid",
});

// Semantic-only search
const semantic = await ob.search.semantic("how does auth work");

// Find similar documents
const similar = await ob.search.similar("doc_abc123");

// Recent documents (last N hours)
const recent = await ob.search.recent({ hours: 24, limit: 10 });

// Documents by author
const authored = await ob.search.byAuthor("person_xyz", { limit: 10 });

// Find people
const people = await ob.search.people("engineering manager");
```

### Connectors

```typescript
// List connected data sources
const connectors = await ob.connectors.list({ status: "active" });

// Get connector details
const detail = await ob.connectors.get("conn_abc");

// Check connector health
const health = await ob.connectors.health("conn_abc");

// List available connector types
const available = await ob.connectors.available({ authType: "OAUTH" });

// Disconnect a connector
await ob.connectors.disconnect("conn_abc");
```

### Sync

```typescript
// Trigger incremental sync
const job = await ob.sync.trigger("conn_abc", "incremental");

// Trigger full re-sync
const fullJob = await ob.sync.trigger("conn_abc", "full");

// Trigger all connectors
const all = await ob.sync.triggerAll({ type: "incremental" });

// Check sync status
const status = await ob.sync.status("conn_abc");

// View sync history
const history = await ob.sync.history("conn_abc", { limit: 10 });

// Live progress
const progress = await ob.sync.progress("conn_abc");

// Fleet health overview
const fleet = await ob.sync.health();

// Recent errors
const errors = await ob.sync.errors({ limit: 20 });

// Control operations
await ob.sync.pause("conn_abc");
await ob.sync.resume("conn_abc");
await ob.sync.cancel("conn_abc");
```

### Actions

Execute write operations across 88+ connectors (send messages, create issues, etc.).

```typescript
// Discover available actions
const actions = await ob.actions.list({ connectorType: "LINEAR" });

// Execute an action
const result = await ob.actions.execute("conn_abc", "issue_create", {
  title: "Fix login bug",
  teamId: "team_123",
  priority: 1,
});
```

### Knowledge Graph

```typescript
// Search entities (people, projects, topics)
const entities = await ob.knowledge.searchEntities("authentication", {
  type: "TOPIC",
  limit: 10,
});

// Get entity details with relations
const entity = await ob.knowledge.getEntity("entity_abc");

// Get entity relations
const relations = await ob.knowledge.getRelations("entity_abc", {
  direction: "both",
});

// Find experts on a topic
const experts = await ob.knowledge.topicExperts("topic_abc");

// Get a person's expertise areas
const expertise = await ob.knowledge.personExpertise("person_abc");

// Browse topic hierarchy
const topics = await ob.knowledge.topics({ limit: 20 });
```

### Agents

```typescript
// List available agent templates
const agents = await ob.agents.list();

// Run an agent
const result = await ob.agents.run("research", "Analyze our API latency trends");

// RAG-powered Q&A with citations
const answer = await ob.agents.ask("What is our SLA for search latency?", {
  connectorTypes: ["NOTION", "CONFLUENCE"],
  maxSources: 5,
});

// Search context database
const context = await ob.agents.contextSearch("deployment procedures");

// Read a specific context entry
const entry = await ob.agents.contextRead("openbeam://resources/team_1/...", {
  level: "2",
});
```

### Team

```typescript
// Get team info
const team = await ob.team.info();

// List members
const members = await ob.team.members();

// Invite a member
await ob.team.inviteMember("new@example.com", "MEMBER");

// Update role
await ob.team.updateRole("user_abc", "ADMIN");

// Remove member
await ob.team.removeMember("user_abc");
```

### API Keys

```typescript
// List API keys
const keys = await ob.apiKeys.list();

// Create a new key
const key = await ob.apiKeys.create("CI Pipeline", [
  "search:read",
  "connectors:read",
]);
console.log(key.key); // Only shown once

// Revoke a key
await ob.apiKeys.revoke("apikey_abc");
```

## Error Handling

```typescript
import OpenBeam, {
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  PermissionError,
  ToolError,
} from "@openbeam/sdk";

try {
  await ob.search.documents("test");
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid or missing API key (401)
  } else if (error instanceof PermissionError) {
    // Insufficient scope (403)
  } else if (error instanceof NotFoundError) {
    // Resource not found (404)
  } else if (error instanceof RateLimitError) {
    // Rate limited (429) — retryAfter available
    console.log(`Retry after ${error.retryAfter}s`);
  } else if (error instanceof ToolError) {
    // MCP tool execution failed (422)
  }
}
```

## Request Options

Every method accepts an options object with:

```typescript
interface RequestOptions {
  signal?: AbortSignal;  // Cancel the request
  timeout?: number;      // Override default timeout (ms)
}

// Example: abort after 5s
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await ob.search.documents("query", { signal: controller.signal });
```

## License

Apache-2.0
