# @openplane/ai

Production-ready AI package for OpenPlane - model-agnostic LLM, embeddings, RAG, and agentic workflows.

## Features

- **Model-Agnostic Providers** - Switch between OpenAI, Anthropic, Google, Azure, and Ollama with a single line change
- **Agentic Workflows** - AI SDK-native agent loops with `maxSteps`, tool calling, and observability
- **RAG Pipeline** - Production-grade retrieval-augmented generation with Vespa backend
- **Database Persistence** - All conversations, executions, and memory backed by PostgreSQL
- **Redis Caching** - Fast context caching, embedding cache, and rate limiting
- **MCP Integration** - Model Context Protocol support for tool discovery and execution
- **Streaming Support** - Native streaming with backpressure handling and UI compatibility
- **UI Message Format** - Compatible with AI SDK's `useChat` and other UI hooks

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        @openplane/ai                            │
├──────────────┬──────────────┬──────────────┬──────────────┐     │
│   Agents     │  Completion  │     RAG      │    Tools     │     │
│  (agentic    │  (generate   │  (retrieval  │   (tool      │     │
│   loops)     │   text)      │   pipeline)  │   registry)  │     │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘     │
       │              │              │              │              │
       ▼              ▼              ▼              ▼              │
┌──────────────────────────────────────────────────────────────┐  │
│                    AI SDK (Vercel)                           │  │
│  generateText, streamText, embed, embedMany, tool, ...       │  │
└──────────────────────────────────────────────────────────────┘  │
       │              │              │              │              │
       ▼              ▼              ▼              ▼              │
┌────────────────────────────────────────────────────────────────┐│
│                    Data Layer                                   ││
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               ││
│  │ @openplane/ │ │ @openplane/ │ │ @openplane/ │               ││
│  │     db      │ │    redis    │ │    vespa    │               ││
│  │(PostgreSQL) │ │  (Cache)    │ │  (Search)   │               ││
│  └─────────────┘ └─────────────┘ └─────────────┘               ││
└────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
bun add @openplane/ai
```

## Quick Start

### Simple Completion

```typescript
import { complete, streamCompletion } from "@openplane/ai";

// Non-streaming completion
const result = await complete([
  { role: "user", content: "What is the capital of France?" },
]);
console.log(result.content);

// Streaming completion
for await (const chunk of streamCompletion([
  { role: "user", content: "Write a haiku about coding" },
])) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}
```

### RAG Pipeline

```typescript
import { ragAnswer, ragStream } from "@openplane/ai";

// Get an answer with retrieved context
const answer = await ragAnswer(
  "What were the key decisions in yesterday's meeting?",
  teamId,
  { retrieval: { topK: 5 } }
);

console.log(answer.answer);
console.log("Sources:", answer.citations);

// Stream with RAG
for await (const chunk of ragStream(query, teamId)) {
  if (chunk.type === "text") {
    process.stdout.write(chunk.content);
  }
}
```

### Agentic Workflows

```typescript
import { createAgent, executeAgent, streamAgent } from "@openplane/ai";

// Create a configured agent
const researchAgent = createAgent({
  systemPrompt: "You are a research assistant...",
  maxSteps: 10,
  temperature: 0.5,
  onStepFinish: async (event) => {
    console.log(`Step ${event.stepType}: ${event.text.slice(0, 100)}...`);
  },
});

// Execute with context
const result = await researchAgent.run("Research our Q3 sales performance", {
  teamId,
  userId,
});

// Or stream the execution
for await (const event of researchAgent.stream(task, context)) {
  switch (event.type) {
    case "text":
      process.stdout.write(event.content);
      break;
    case "tool-call":
      console.log(`Calling tool: ${event.toolName}`);
      break;
    case "done":
      console.log("\nDone:", event.result.usage);
      break;
  }
}
```

### Database-Backed Memory

```typescript
import { getOrCreateMemory } from "@openplane/ai";

// Create memory for a conversation (persisted to DB, cached in Redis)
const { memory, conversationId } = await getOrCreateMemory(teamId, userId);

// Add messages (automatically persisted)
await memory.add({
  role: "user",
  content: "What's the project status?",
  timestamp: Date.now(),
});

// Get conversation history
const messages = await memory.toMessages();

// Search memory semantically
const relevant = await memory.search("budget discussions", 5);
```

### Tool Registration

```typescript
import { defineTool, registerTool, toolRegistry } from "@openplane/ai";
import { z } from "zod";

// Define a custom tool
const myTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a location",
  category: "data",
  parameters: z.object({
    location: z.string().describe("City name"),
    units: z.enum(["celsius", "fahrenheit"]).optional(),
  }),
  execute: async (params, context) => {
    // Your implementation
    return { temperature: 22, condition: "sunny" };
  },
});

// Register it
registerTool(myTool);

// Use with agents (tools are automatically available)
const agent = createAgent({ maxSteps: 5 });
const result = await agent.run("What's the weather in Paris?", context);
```

### MCP Integration

```typescript
import {
  createMCPServer,
  importMCPServer,
  mcpToolsToAISDK,
} from "@openplane/ai";

// Connect to an MCP server
const server = createMCPServer({
  name: "my-mcp-server",
  transport: "http",
  url: "http://localhost:3001",
});

// Import all tools from the server
const importedTools = await importMCPServer(server);

// Or convert to AI SDK format for direct use
const aiTools = mcpToolsToAISDK(await server.listTools(), server);
```

### UI Message Compatibility

```typescript
import {
  toUIMessages,
  fromUIMessages,
  createDataStream,
  createTextPart,
  createFinishPart,
} from "@openplane/ai";

// Convert for useChat compatibility
const uiMessages = toUIMessages(internalMessages);

// Stream to UI
const stream = createDataStream(async function* () {
  for await (const chunk of completion) {
    yield createTextPart(chunk.content);
  }
  yield createFinishPart("stop", { promptTokens: 100, completionTokens: 50 });
});

// Return as Response
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream" },
});
```

## Providers

### Supported Models

| Provider  | Models                                                               |
| --------- | -------------------------------------------------------------------- |
| OpenAI    | gpt-4.1, gpt-4.1-mini, gpt-4o, o1, o3-mini, gpt-4-turbo              |
| Anthropic | claude-sonnet-4, claude-opus-4, claude-3.7-sonnet, claude-3.5-sonnet |
| Google    | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro   |
| Azure     | gpt-4o, gpt-4-turbo (via Azure OpenAI Service)                       |
| Ollama    | Any locally hosted model                                             |

### Switching Providers

```typescript
import { registry, getConfig, updateConfig } from "@openplane/ai";

// Get model from any provider
const model = registry.getChatModel("anthropic", "claude-sonnet-4-20250514");

// Update default provider at runtime
updateConfig({ defaultProvider: "anthropic" });

// List available models
const chatModels = registry.getChatModels();
const embeddingModels = registry.getEmbeddingModels();
```

## Configuration

All configuration via environment variables:

```bash
# Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_RESOURCE_NAME=...

# Default Settings
AI_DEFAULT_PROVIDER=openai
AI_DEFAULT_CHAT_MODEL=gpt-4o
AI_DEFAULT_EMBEDDING_MODEL=text-embedding-3-small

# RAG Settings
RAG_MAX_CONTEXT_TOKENS=16000
RAG_DEFAULT_TOP_K=10
RAG_MIN_RELEVANCE_SCORE=0.3

# Agent Settings
AGENT_MAX_STEPS=15
AGENT_MAX_TOOL_ROUNDTRIPS=10
AGENT_TIMEOUT_MS=300000

# Caching
AI_ENABLE_EMBEDDING_CACHE=true
AI_EMBEDDING_CACHE_TTL=604800
AI_ENABLE_CONTEXT_CACHE=true
```

## Design Principles

1. **No In-Memory State** - All context, conversations, and memory persisted to database
2. **Caching Where It Matters** - Redis caching for embeddings, context, and rate limits
3. **Clean Separation** - AI package doesn't know about HTTP, workers only orchestrate
4. **Model Agnostic** - Switch providers without code changes
5. **Production Ready** - Observability, error handling, and rate limiting built-in

## License

MIT
