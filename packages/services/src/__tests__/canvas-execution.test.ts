import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  mock,
  setDefaultTimeout,
} from "bun:test";
import type {
  ClassifyExecutionResult,
  ExecutionPlanNode,
  ExtractionResult,
  RagExecutionResult,
  SummarizeExecutionResult,
} from "@openplane/types/canvas";

setDefaultTimeout(30_000);

const completeMock = mock(() =>
  Promise.resolve({
    content: "ok",
    role: "assistant" as const,
    finishReason: "stop" as const,
    usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    latencyMs: 1,
  })
);
const completeWithContextMock = mock(() =>
  Promise.resolve({
    content: "rag answer",
    role: "assistant" as const,
    finishReason: "stop" as const,
    usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
    latencyMs: 1,
    citations: [
      {
        documentId: "doc-1",
        title: "Doc 1",
        snippet: "Hello",
        relevanceScore: 0.9,
      },
    ],
    contextUsed: 1,
  })
);
const generateImageMock = mock(() =>
  Promise.resolve({
    image: {
      base64: "AQID",
      uint8Array: new Uint8Array([1, 2, 3]),
      mediaType: "image/png",
    },
    images: [
      {
        base64: "AQID",
        uint8Array: new Uint8Array([1, 2, 3]),
        mediaType: "image/png",
      },
    ],
    warnings: [],
    responses: [],
    providerMetadata: { openai: { images: [{ revisedPrompt: "Refined" }] } },
    usage: { inputTokens: 4, outputTokens: 0, totalTokens: 4 },
  })
);
const runAgentMock = mock(() =>
  Promise.resolve({
    output: "agent-output",
  })
);
const executeToolMock = mock((params: unknown) =>
  Promise.resolve({
    success: true,
    data: params,
    metadata: { latencyMs: 1 },
  })
);
const slackCallMock = mock((method: string) => {
  if (method === "chat.postMessage") {
    return Promise.resolve({ ok: true, ts: "1711.22", channel: "C123" });
  }
  return Promise.resolve({ ok: true });
});
const sendSlackMessageMock = mock(
  (_client: unknown, _params: Record<string, unknown>) =>
    Promise.resolve({
      success: true,
      messageTs: "1711.22",
      channelId: "C123",
    })
);

const connectorRegistry = {
  connectorType: "slack",
  connectorName: "Slack",
  connectorIcon: "slack",
  actions: [
    {
      id: "message_send",
      name: "Send Message",
      description: "Send a message",
      connectorType: "slack",
      resource: "message",
      category: "create",
      inputs: [
        { id: "channel", name: "Channel", type: "string", required: true },
        { id: "text", name: "Text", type: "string", required: true },
        { id: "thread_ts", name: "Thread", type: "string", required: false },
      ],
      outputs: [],
      stakes: "low",
      reversible: false,
      batchSupport: false,
    },
  ],
};

function isRequestLike(value: unknown): value is { url: string } {
  return (
    value !== null &&
    typeof value === "object" &&
    "url" in value &&
    typeof (value as { url?: unknown }).url === "string"
  );
}

function resolveFetchUrl(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (isRequestLike(input)) {
    return input.url;
  }
  return "";
}

const fetchMock = mock((input: unknown, init?: RequestInit) => {
  const url = resolveFetchUrl(input);
  const method = (init?.method ?? "GET").toUpperCase();

  if (url.endsWith("/audio/speech")) {
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "audio/mpeg" },
    });
  }

  if (url.endsWith("/videos") && method === "POST") {
    return new Response(
      JSON.stringify({
        id: "video_123",
        status: "queued",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  if (url.endsWith("/videos/video_123") && method === "GET") {
    return new Response(
      JSON.stringify({
        id: "video_123",
        status: "completed",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  if (url.endsWith("/videos/video_123/content")) {
    return new Response(new Uint8Array([4, 5, 6]), {
      status: 200,
      headers: { "content-type": "video/mp4" },
    });
  }

  if (url.endsWith("/http/echo")) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (url.endsWith("/graphql")) {
    return new Response(
      JSON.stringify({
        data: {
          users: [{ id: "user-1" }],
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  return new Response("Not found", { status: 404 });
});
const originalFetch = globalThis.fetch;
const chunkDocumentMock = mock(
  (
    text: string,
    documentId: string,
    config: {
      strategy?: string;
      maxChunkSize?: number;
      chunkOverlap?: number;
      preserveParagraphs?: boolean;
    } = {}
  ) => [
    {
      id: `${documentId}-0`,
      text,
      index: 0,
      startOffset: 0,
      endOffset: text.length,
      tokenCount: Math.max(text.length, 1),
      metadata: config,
    },
  ]
);

class MockCompletionService {
  complete() {
    return completeMock();
  }
}

class MockEmbeddingService {
  embed(text: string) {
    return Promise.resolve({
      embedding: [3, 4],
      text,
      tokenCount: 2,
    });
  }

  embedBatch(texts: string[]) {
    return Promise.resolve({
      embeddings: texts.map(() => [3, 4]),
      texts,
      totalTokens: texts.length * 2,
    });
  }
}

const memoryStoreMock = {
  store: mock(() => Promise.resolve("mem-1")),
  delete: mock(() => Promise.resolve()),
};
const memoryConsolidatorMock = {
  semantic: memoryStoreMock,
  episodic: memoryStoreMock,
  procedural: memoryStoreMock,
};

const toolRegistryMock = {
  bindServices: mock(() => null),
  getTool: mock((name: string) =>
    name === "mock_tool" ? { execute: executeToolMock } : null
  ),
  getMetadata: mock((name: string) =>
    name === "mock_tool" ? { requiredPermissions: [] } : null
  ),
  getToolInfo: mock((name: string) =>
    name === "mock_tool"
      ? {
          name: "mock_tool",
          description: "Mock tool",
          category: "data",
          inputSchema: {
            safeParse: (value: unknown) => ({ success: true, data: value }),
          },
        }
      : null
  ),
  getServices: mock(() => ({})),
  runWithContextAsync: async (_context: unknown, fn: () => Promise<unknown>) =>
    await fn(),
};

const rerankMock = mock(() => Promise.resolve(null));

mock.module("@openplane/ai", () => ({
  CompletionService: MockCompletionService,
  EmbeddingService: MockEmbeddingService,
  composeAgents: (name: string, agents: unknown[]) => ({
    type: "sequential",
    name,
    subAgents: agents,
  }),
  createMemoryAccess: () => Promise.resolve({}),
  createMemoryConsolidator: () => memoryConsolidatorMock,
  convertZodToJsonSchema: () => ({ type: "object" }),
  getConfig: () => ({
    defaultProvider: "openai",
    defaultChatModel: "test-model",
    defaultEmbeddingModel: "test-embed",
    providers: {
      openai: { apiKey: "test" },
      anthropic: {},
      google: { apiKey: "test" },
      azure: {},
      ollama: { baseURL: "" },
      twelvelabs: {},
    },
    embedding: { dimensions: 1, maxTokens: 1, batchSize: 1 },
    completion: { temperature: 0.7, maxTokens: 128, topP: 1 },
    agent: {
      maxSteps: 1,
      maxTokensPerStep: 1,
      timeoutMs: 1,
      maxToolRoundtrips: 1,
      enableParallelTools: false,
    },
    engine: { baseURL: "", gpuURL: "", timeout: 1 },
  }),
  getBGEM3Provider: () => ({}),
  estimateTokens: () => 0,
  complete: completeMock,
  completeWithContext: completeWithContextMock,
  runAgent: runAgentMock,
  parallelizeAgents: (name: string, agents: unknown[]) => ({
    type: "parallel",
    name,
    subAgents: agents,
  }),
  routeAgents: (name: string, agents: unknown[], defaultAgent?: string) => ({
    type: "coordinator",
    name,
    subAgents: agents,
    defaultAgent,
  }),
  streamCompletion: () =>
    (async function* () {
      await Promise.resolve();
      yield* [];
    })(),
  chunkDocument: chunkDocumentMock,
  registerAllTools: mock(() => 0),
  registerAllBuiltinTools: mock(() => 0),
  toolRegistry: toolRegistryMock,
  isReasoningChunk: () => false,
  isReasoningDeltaChunk: () => false,
  extractReasoningContent: () => "",
  buildThinkingProviderOptions: () => ({}),
  getProviderOptionsForModel: () => ({}),
  registry: {
    languageModel: () => null,
    textEmbeddingModel: () => null,
  },
  embedQueryWithCache: mock(() => Promise.resolve([])),
}));

mock.module("@openplane/ai/agents", () => ({
  researchAgentConfig: { type: "llm", name: "research" },
  deepResearchAgentConfig: {
    type: "loop",
    name: "deep-research",
    subAgents: [{ type: "llm", name: "deep-research-base" }],
  },
  analystAgentConfig: { type: "llm", name: "analyst" },
  multiSourceAnalystConfig: {
    type: "parallel",
    name: "multi-source-analyst",
    subAgents: [{ type: "llm", name: "analyst" }],
  },
  slackAnalystConfig: { type: "llm", name: "slack-analyst" },
  notionAnalystConfig: { type: "llm", name: "notion-analyst" },
  driveAnalystConfig: { type: "llm", name: "drive-analyst" },
  coderAgentConfig: { type: "llm", name: "coder" },
  reviewerAgentConfig: { type: "llm", name: "reviewer" },
  codeWithReviewConfig: {
    type: "sequential",
    name: "code-with-review",
    subAgents: [{ type: "llm", name: "coder" }],
  },
  writerAgentConfig: { type: "llm", name: "writer" },
}));

mock.module("../search/reranking/service", () => ({
  rerankerService: {
    rerank: rerankMock,
  },
}));

mock.module("ai", () => ({
  generateImage: generateImageMock,
}));

mock.module("@openplane/integrations/connector-actions", () => ({
  ALL_CONNECTOR_ACTION_REGISTRIES: [connectorRegistry],
}));

mock.module("@openplane/db", () => ({
  __esModule: true,
  default: {},
  AppType: {
    SLACK: "SLACK",
    GMAIL: "GMAIL",
    GOOGLE_DRIVE: "GOOGLE_DRIVE",
    NOTION: "NOTION",
    LINEAR: "LINEAR",
    JIRA: "JIRA",
    GITHUB: "GITHUB",
    CONFLUENCE: "CONFLUENCE",
    MICROSOFT_TEAMS: "MICROSOFT_TEAMS",
    DISCORD: "DISCORD",
    OUTLOOK: "OUTLOOK",
    ONEDRIVE: "ONEDRIVE",
    SHAREPOINT: "SHAREPOINT",
    DROPBOX: "DROPBOX",
    BOX: "BOX",
    ASANA: "ASANA",
    TRELLO: "TRELLO",
    CLICKUP: "CLICKUP",
    MONDAY: "MONDAY",
    BASECAMP: "BASECAMP",
    GITLAB: "GITLAB",
    BITBUCKET: "BITBUCKET",
  },
  ConnectorStatus: {
    ACTIVE: "ACTIVE",
    SYNCING: "SYNCING",
    AUTH_EXPIRED: "AUTH_EXPIRED",
  },
  getConnectorsNeedingRefresh: () => Promise.resolve([]),
  findConnectorById: () =>
    Promise.resolve({ id: "connector-1", status: "ACTIVE", app: "SLACK" }),
  recordRefreshFailure: () => Promise.resolve(),
  updateConnector: () => Promise.resolve(),
  updateOAuthTokens: () => Promise.resolve(),
  decryptIfEncrypted: (value: string | null | undefined) => value ?? null,
  verifyConnectorOwnership: () => Promise.resolve({ app: "SLACK" }),
  getConnectorWithCredentials: () =>
    Promise.resolve({ config: { teamId: "T1" } }),
  getOAuthProvider: () =>
    Promise.resolve({
      accessToken: "token",
      accessTokenIv: null,
      syncAccessToken: null,
      syncAccessTokenIv: null,
    }),
}));

mock.module("@openplane/redis", () => {
  const cacheStub = {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    del: () => Promise.resolve(),
    mget: () => Promise.resolve([]),
    mset: () => Promise.resolve(),
  };
  const redisMulti = {
    zRemRangeByScore: () => redisMulti,
    zCard: () => redisMulti,
    zAdd: () => redisMulti,
    expire: () => redisMulti,
    exec: () => Promise.resolve([0, 0, 0, 0]),
  };
  const redisClientMock = {
    multi: () => redisMulti,
    zCount: () => Promise.resolve(0),
    del: () => Promise.resolve(0),
    get: cacheStub.get,
    set: cacheStub.set,
    quit: () => Promise.resolve(),
  };
  const rateLimiter = {
    checkConnectorRateLimit: () => Promise.resolve({ allowed: true }),
    waitForQuota: () => Promise.resolve(true),
    getRemainingQuota: () => Promise.resolve({}),
    checkLimit: () => Promise.resolve(true),
    getUsage: () => Promise.resolve(0),
    reset: () => Promise.resolve(),
  };
  const getCache = () => cacheStub;
  return {
    rateLimiter,
    DEFAULT_RATE_LIMITS: {},
    getRedisClient: () => Promise.resolve(redisClientMock),
    redisClient: null,
    cache: cacheStub,
    getRAGCache: getCache,
    getSearchCache: getCache,
    getSemanticCache: getCache,
    getEmbeddingCache: getCache,
    getPermissionCache: getCache,
    getUserProfileCache: getCache,
    cacheSidebarContext: () => Promise.resolve(),
    getSidebarContext: () => Promise.resolve(null),
    deleteSidebarContext: () => Promise.resolve(),
    getSidebarContextKey: () => "sidebar",
  };
});

mock.module("../slack/client", () => ({
  createSlackClient: () => ({
    call: slackCallMock,
  }),
}));

mock.module("../slack/actions", () => ({
  sendMessage: sendSlackMessageMock,
  updateMessage: () =>
    Promise.resolve({ success: true, messageTs: "1711.22", channelId: "C123" }),
  addReaction: () => Promise.resolve({ success: true }),
  createChannel: () => Promise.resolve({ success: true, channelId: "C123" }),
  archiveChannel: () => Promise.resolve({ success: true }),
  inviteToChannel: () => Promise.resolve({ success: true }),
  sendDM: () =>
    Promise.resolve({ success: true, messageTs: "1711.22", channelId: "D123" }),
  setChannelPurpose: () => Promise.resolve({ success: true }),
  setChannelTopic: () => Promise.resolve({ success: true }),
}));

const searchUnifiedMock = mock(() =>
  Promise.resolve({
    items: [
      {
        type: "document",
        relevance: 0.9,
        data: {
          id: "doc-1",
          connector_id: "connector-1",
          connector_type: "slack",
          team_id: "team-1",
          workspace_id: "ws-1",
          external_id: "ext-1",
          document_type: "message",
          title: "Doc 1",
          content: "Hello world. ".repeat(10),
          created_at: 0,
          updated_at: 0,
        },
      },
    ],
    total: 1,
    queryTime: 1,
  })
);

const pgQueryMock = mock((_text: string, _values?: unknown[]) =>
  Promise.resolve({
    rows: [{ id: "user-1", name: "Ada" }],
    rowCount: 1,
    fields: [{ name: "id" }, { name: "name" }],
    command: "SELECT",
    oid: 0,
  })
);

class MockPgClient {
  query = pgQueryMock;
  release = mock(() => null);
}

class MockPgPool {
  query = pgQueryMock;
  connect = mock(async () => new MockPgClient());
}

mock.module("pg", () => ({
  Pool: MockPgPool,
}));

mock.module("../search/service", () => ({
  searchService: {
    searchUnified: searchUnifiedMock,
  },
}));

mock.module("../ai/tool-binder", () => ({
  createToolServices: () => ({}),
}));

const executorRegistry = new Map<string, (...args: unknown[]) => unknown>();
let executorsLoaded = false;

mock.module("../canvas/registry", () => ({
  registerCanvasNodeExecutor: (
    nodeType: string,
    executor: (...args: unknown[]) => unknown
  ) => {
    executorRegistry.set(nodeType, executor);
  },
  getCanvasNodeExecutor: (nodeType: string) => executorRegistry.get(nodeType),
  listCanvasNodeExecutors: () => Array.from(executorRegistry.keys()),
  freezeRegistry: () => {
    return;
  },
}));

mock.module("../canvas/defaults", () => ({
  registerDefaultCanvasNodeExecutors: () => {
    if (executorsLoaded) {
      return;
    }
  },
}));

let executeCanvasNode: typeof import("../canvas").executeCanvasNode;
let CanvasNodeExecutorNotFoundError: typeof import("../canvas").CanvasNodeExecutorNotFoundError;

beforeAll(async () => {
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  const [
    { startExecutor },
    { agentCallExecutor },
    { audioExecutor },
    { codeExecutor },
    { connectorActionExecutor },
    { connectorExecutor },
    { conditionExecutor },
    { endExecutor },
    { transformExecutor },
    { filterExecutor },
    { httpRequestExecutor },
    { databaseQueryExecutor },
    { graphqlQueryExecutor },
    { toolExecutor },
    { memoryWriteExecutor },
    { memoryReadExecutor },
    { memorySearchExecutor },
    { chunkExecutor },
    { templateExecutor },
    { notifyExecutor },
    { llmExecutor },
    { mergeExecutor },
    { ragExecutor },
    { rerankExecutor },
    { summarizeExecutor },
    { embeddingsExecutor },
    { extractExecutor },
    { classifyExecutor },
    { imageExecutor },
    { videoExecutor },
    {
      triggerManualExecutor,
      triggerScheduleExecutor,
      triggerWebhookExecutor,
      triggerEventExecutor,
    },
  ] = await Promise.all([
    import("../canvas/executors/start"),
    import("../canvas/executors/agent-call"),
    import("../canvas/executors/audio"),
    import("../canvas/executors/code"),
    import("../canvas/executors/connector-action"),
    import("../canvas/executors/connector"),
    import("../canvas/executors/condition"),
    import("../canvas/executors/end"),
    import("../canvas/executors/transform"),
    import("../canvas/executors/filter"),
    import("../canvas/executors/http-request"),
    import("../canvas/executors/database-query"),
    import("../canvas/executors/graphql-query"),
    import("../canvas/executors/tool"),
    import("../canvas/executors/memory-write"),
    import("../canvas/executors/memory-read"),
    import("../canvas/executors/memory-search"),
    import("../canvas/executors/chunk"),
    import("../canvas/executors/template"),
    import("../canvas/executors/notify"),
    import("../canvas/executors/llm"),
    import("../canvas/executors/merge"),
    import("../canvas/executors/rag"),
    import("../canvas/executors/rerank"),
    import("../canvas/executors/summarize"),
    import("../canvas/executors/embeddings"),
    import("../canvas/executors/extract"),
    import("../canvas/executors/classify"),
    import("../canvas/executors/image"),
    import("../canvas/executors/video"),
    import("../canvas/executors/trigger"),
  ]);

  const entries: [string, unknown][] = [
    ["start", startExecutor],
    ["agent_call", agentCallExecutor],
    ["audio", audioExecutor],
    ["code", codeExecutor],
    ["connector_action", connectorActionExecutor],
    ["connector", connectorExecutor],
    ["condition", conditionExecutor],
    ["end", endExecutor],
    ["transform", transformExecutor],
    ["filter", filterExecutor],
    ["http_request", httpRequestExecutor],
    ["database_query", databaseQueryExecutor],
    ["graphql_query", graphqlQueryExecutor],
    ["tool", toolExecutor],
    ["memory_write", memoryWriteExecutor],
    ["memory_read", memoryReadExecutor],
    ["memory_search", memorySearchExecutor],
    ["chunk", chunkExecutor],
    ["template", templateExecutor],
    ["notify", notifyExecutor],
    ["llm", llmExecutor],
    ["merge", mergeExecutor],
    ["rag", ragExecutor],
    ["rerank", rerankExecutor],
    ["summarize", summarizeExecutor],
    ["embeddings", embeddingsExecutor],
    ["extract", extractExecutor],
    ["classify", classifyExecutor],
    ["image", imageExecutor],
    ["video", videoExecutor],
    ["trigger_manual", triggerManualExecutor],
    ["trigger_schedule", triggerScheduleExecutor],
    ["trigger_webhook", triggerWebhookExecutor],
    ["trigger_event", triggerEventExecutor],
  ];

  for (const [type, executor] of entries) {
    executorRegistry.set(type, executor as (...args: unknown[]) => unknown);
  }
  executorsLoaded = true;

  const mod = await import("../canvas");
  executeCanvasNode = mod.executeCanvasNode;
  CanvasNodeExecutorNotFoundError = mod.CanvasNodeExecutorNotFoundError;
});

afterAll(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

const baseNode = (type: ExecutionPlanNode["type"]): ExecutionPlanNode => ({
  id: `node-${type}`,
  type,
  data: {},
  inbound: [],
  outbound: [],
});

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }
  process.env[key] = value;
};

describe("executeCanvasNode", () => {
  it("executes start node", async () => {
    const input = { value: 1 };
    const result = await executeCanvasNode({
      node: baseNode("start"),
      input,
    });

    expect(result).toEqual(input);
  });

  it("executes transform node with jmespath", async () => {
    const input = { a: { b: 1 } };
    const node = baseNode("transform");
    node.data = { config: { expression: "a.b", language: "jmespath" } };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toBe(1);
  });

  it("executes transform node with jsonata", async () => {
    const input = { a: { b: 2 } };
    const node = baseNode("transform");
    node.data = { config: { expression: "a.b", language: "jsonata" } };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toBe(2);
  });

  it("executes transform node with javascript", async () => {
    const input = { a: { b: 3 } };
    const node = baseNode("transform");
    node.data = {
      config: { expression: "input.a.b + 1", language: "javascript" },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toBe(4);
  });

  it("executes http request node", async () => {
    const node = baseNode("http_request");
    node.data = {
      config: {
        url: "https://api.example.com/http/echo",
        method: "POST",
        bodyType: "json",
        bodyContent: '{"hello":"world"}',
      },
    };

    const result = await executeCanvasNode({
      node,
      input: undefined,
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    });

    expect(result).toMatchObject({
      status: 200,
      ok: true,
      body: { ok: true },
    });
    expect(result).toHaveProperty("durationMs");
  });

  it("executes graphql query node", async () => {
    const node = baseNode("graphql_query");
    node.data = {
      config: {
        endpoint: "https://api.example.com/graphql",
        method: "POST",
        operationType: "query",
        query: "query GetUsers { users { id } }",
        variables: "",
        headers: [],
        auth: { type: "none" },
        timeoutMs: 30_000,
        includeExtensions: false,
        followRedirects: true,
        responsePath: "users[0].id",
        continueOnError: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: undefined,
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    });

    expect(result).toMatchObject({
      data: "user-1",
      ok: true,
      status: 200,
    });
  });

  it("executes database query node", async () => {
    const previous = process.env.OPENPLANE_CANVAS_DB_CONNECTIONS;
    process.env.OPENPLANE_CANVAS_DB_CONNECTIONS = JSON.stringify({
      primary: {
        url: "postgres://user:pass@localhost:5432/app",
        engine: "postgresql",
      },
    });
    pgQueryMock.mockClear();

    try {
      const node = baseNode("database_query");
      node.data = {
        config: {
          connectionId: "primary",
          engine: "postgresql",
          operation: "execute_query",
          query: "SELECT * FROM users WHERE id = $1",
          parameters: [{ name: "id", value: "42", type: "number" }],
          timeout: 30_000,
          readOnly: true,
          maxRows: 1000,
          batchMode: "single",
          outputFormat: "rows",
          continueOnError: false,
        },
      };

      const result = await executeCanvasNode({
        node,
        input: undefined,
        context: {
          executionId: "exec-1",
          agentCanvasId: "canvas-1",
          versionNumber: 1,
          teamId: "team-1",
          triggeredById: "user-1",
        },
      });

      expect(result).toMatchObject({
        data: [{ id: "user-1", name: "Ada" }],
        rows: [{ id: "user-1", name: "Ada" }],
        returnedRows: 1,
        totalRows: 1,
        outputFormat: "rows",
      });

      const selectCall = pgQueryMock.mock.calls.find(
        (call) => call[0] === "SELECT * FROM users WHERE id = $1"
      ) as [string, unknown[]] | undefined;
      expect(selectCall?.[0]).toBe("SELECT * FROM users WHERE id = $1");
      expect(selectCall?.[1]).toEqual([42]);
    } finally {
      restoreEnv("OPENPLANE_CANVAS_DB_CONNECTIONS", previous);
    }
  });

  it("rejects write query when read only", async () => {
    const previous = process.env.OPENPLANE_CANVAS_DB_CONNECTIONS;
    process.env.OPENPLANE_CANVAS_DB_CONNECTIONS = JSON.stringify({
      primary: {
        url: "postgres://user:pass@localhost:5432/app",
        engine: "postgresql",
      },
    });
    try {
      const node = baseNode("database_query");
      node.data = {
        config: {
          connectionId: "primary",
          engine: "postgresql",
          operation: "execute_query",
          query: "UPDATE users SET name = 'x'",
          parameters: [],
          timeout: 30_000,
          readOnly: true,
          maxRows: 1000,
          batchMode: "single",
          outputFormat: "rows",
          continueOnError: false,
        },
      };

      await expect(
        executeCanvasNode({
          node,
          input: undefined,
          context: {
            executionId: "exec-1",
            agentCanvasId: "canvas-1",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
          },
        })
      ).rejects.toThrow("Read-only");
    } finally {
      restoreEnv("OPENPLANE_CANVAS_DB_CONNECTIONS", previous);
    }
  });

  it("executes tool node", async () => {
    const node = baseNode("tool");
    node.data = {
      config: {
        toolId: "mock_tool",
        parameterBindings: {
          query: { mode: "variable", variableRef: "query" },
          limit: { mode: "static", staticValue: 3 },
        },
      },
    };

    const result = await executeCanvasNode({
      node,
      input: { query: "hello" },
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    });

    expect(result).toMatchObject({
      success: true,
      data: { query: "hello", limit: 3 },
    });
  });

  it("executes memory write node", async () => {
    const node = baseNode("memory_write");
    node.data = {
      config: {
        key: "user_prefs",
        scope: "workflow",
        memoryType: "semantic",
        encoding: "json",
        overwrite: true,
        generateEmbedding: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: { theme: "dark" },
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    });

    expect(result).toMatchObject({
      stored: true,
      key: "user_prefs",
      scope: "workflow",
      memoryType: "semantic",
      encoding: "json",
    });
  });

  it("executes memory read node", async () => {
    const context = {
      executionId: "exec-memory-read",
      agentCanvasId: "canvas-1",
      versionNumber: 1,
      teamId: "team-1",
      triggeredById: "user-1",
    };
    const writeNode = baseNode("memory_write");
    writeNode.data = {
      config: {
        key: "read_key",
        scope: "workflow",
        memoryType: "semantic",
        encoding: "json",
        overwrite: true,
        generateEmbedding: false,
      },
    };

    await executeCanvasNode({
      node: writeNode,
      input: { mode: "strict" },
      context,
    });

    const readNode = baseNode("memory_read");
    readNode.data = {
      config: {
        key: "read_key",
        scope: "workflow",
        includeMetadata: true,
      },
    };

    const result = await executeCanvasNode({
      node: readNode,
      input: undefined,
      context,
    });

    expect(result).toMatchObject({
      found: true,
      value: { mode: "strict" },
      entry: {
        key: "read_key",
        scope: "workflow",
        encoding: "json",
      },
    });
  });

  it("executes memory search node", async () => {
    const context = {
      executionId: "exec-memory-search",
      agentCanvasId: "canvas-1",
      versionNumber: 1,
      teamId: "team-1",
      triggeredById: "user-1",
    };
    const writeNode = baseNode("memory_write");
    writeNode.data = {
      config: {
        key: "alpha_key",
        scope: "workflow",
        memoryType: "semantic",
        encoding: "text",
        overwrite: true,
        generateEmbedding: false,
      },
    };

    await executeCanvasNode({
      node: writeNode,
      input: "alpha memory",
      context,
    });

    const writeNode2 = baseNode("memory_write");
    writeNode2.data = {
      config: {
        key: "beta_key",
        scope: "workflow",
        memoryType: "semantic",
        encoding: "text",
        overwrite: true,
        generateEmbedding: false,
      },
    };

    await executeCanvasNode({
      node: writeNode2,
      input: "beta memory",
      context,
    });

    const searchNode = baseNode("memory_search");
    searchNode.data = {
      config: {
        query: "alpha",
        scope: "workflow",
        searchMode: "keyword",
        topK: 10,
        threshold: 0.5,
        includeMetadata: false,
      },
    };

    const result = (await executeCanvasNode({
      node: searchNode,
      input: undefined,
      context,
    })) as {
      results: Record<string, unknown>[];
      total: number;
      returned: number;
    };

    expect(result.total).toBe(1);
    expect(result.returned).toBe(1);
    expect(result.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "alpha_key" })])
    );
  });

  it("executes filter node with visual conditions", async () => {
    const input = { status: "active", score: 12 };
    const node = baseNode("filter");
    node.data = {
      config: {
        mode: "visual",
        logic: "and",
        conditions: [
          {
            id: "cond-1",
            field: "status",
            dataType: "string",
            operator: "equals",
            value: "active",
          },
        ],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual(input);
  });

  it("filters array inputs with visual conditions", async () => {
    const input = [{ score: 10 }, { score: 3 }];
    const node = baseNode("filter");
    node.data = {
      config: {
        mode: "visual",
        logic: "and",
        conditions: [
          {
            id: "cond-1",
            field: "score",
            dataType: "number",
            operator: "greater_than",
            value: 5,
          },
        ],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual([{ score: 10 }]);
  });

  it("filters array inputs with javascript expression", async () => {
    const input = [{ score: 7 }, { score: 2 }];
    const node = baseNode("filter");
    node.data = {
      config: {
        mode: "expression",
        expression: "item.score > 5",
        language: "javascript",
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual([{ score: 7 }]);
  });

  it("returns null when filter does not match", async () => {
    const input = { status: "inactive" };
    const node = baseNode("filter");
    node.data = {
      config: {
        mode: "visual",
        logic: "and",
        conditions: [
          {
            id: "cond-1",
            field: "status",
            dataType: "string",
            operator: "equals",
            value: "active",
          },
        ],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toBeNull();
  });

  it("executes condition node with visual branches", async () => {
    const input = { status: "approved" };
    const node = baseNode("condition");
    node.data = {
      config: {
        mode: "visual",
        evaluationOrder: "sequential",
        branches: [
          {
            id: "approved",
            label: "Approved",
            groups: [
              {
                id: "group-1",
                logic: "and",
                conditions: [
                  {
                    id: "cond-1",
                    field: "status",
                    dataType: "string",
                    operator: "equals",
                    value: "approved",
                  },
                ],
              },
            ],
          },
          {
            id: "rejected",
            label: "Rejected",
            groups: [
              {
                id: "group-2",
                logic: "and",
                conditions: [
                  {
                    id: "cond-2",
                    field: "status",
                    dataType: "string",
                    operator: "equals",
                    value: "rejected",
                  },
                ],
              },
            ],
          },
        ],
        defaultBranchLabel: "Default",
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual({
      branchId: "approved",
      matchedBranchIds: ["approved"],
    });
  });

  it("executes condition node with default branch when no match", async () => {
    const input = { status: "pending" };
    const node = baseNode("condition");
    node.data = {
      config: {
        mode: "visual",
        evaluationOrder: "sequential",
        branches: [
          {
            id: "approved",
            label: "Approved",
            groups: [
              {
                id: "group-1",
                logic: "and",
                conditions: [
                  {
                    id: "cond-1",
                    field: "status",
                    dataType: "string",
                    operator: "equals",
                    value: "approved",
                  },
                ],
              },
            ],
          },
        ],
        defaultBranchLabel: "Fallback",
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual({
      branchId: "default",
      matchedBranchIds: ["default"],
    });
  });

  it("executes condition node with expression", async () => {
    const input = { status: "rejected" };
    const node = baseNode("condition");
    node.data = {
      config: {
        mode: "expression",
        expression:
          "if (input.status === 'rejected') return 'rejected'; return 'default';",
        branches: [
          { id: "approved", label: "Approved", groups: [] },
          { id: "rejected", label: "Rejected", groups: [] },
        ],
        defaultBranchLabel: "Default",
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual({
      branchId: "rejected",
      matchedBranchIds: ["rejected"],
    });
  });

  it("executes template node with handlebars", async () => {
    const input = { name: "Ada" };
    const node = baseNode("template");
    node.data = {
      config: {
        template: "Hello {{name}}",
        syntax: "handlebars",
        outputFormat: "text",
        variables: [{ id: "v1", name: "name", type: "string", required: true }],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toBe("Hello Ada");
  });

  it("executes template node with ejs and json validation", async () => {
    const input = { name: "Ada", count: 2 };
    const node = baseNode("template");
    node.data = {
      config: {
        template: '{"name":"<%= name %>","count":<%= count %>}',
        syntax: "ejs",
        outputFormat: "json",
        validation: { enabled: true, validateJson: true },
        variables: [
          { id: "v1", name: "name", type: "string", required: true },
          { id: "v2", name: "count", type: "number", required: true },
        ],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual({ name: "Ada", count: 2 });
  });

  it("executes code node with javascript", async () => {
    const input = { items: [{ value: 2 }, { value: 3 }] };
    const node = baseNode("code");
    node.data = {
      config: {
        runtime: "javascript",
        code: "const total = input.items.reduce((sum, item) => sum + item.value, 0); return { total };",
        inputVariables: [
          {
            id: "v1",
            name: "items",
            type: "array",
            required: true,
            sourcePath: "items",
          },
        ],
      },
    };

    const result = await executeCanvasNode({
      node,
      input,
    });

    expect(result).toEqual({ total: 5 });
  });

  it("errors on unsupported code runtime", async () => {
    const node = baseNode("code");
    node.data = {
      config: {
        runtime: "python",
        code: "print('nope')",
      },
    };

    await expect(
      executeCanvasNode({
        node,
        input: {},
      })
    ).rejects.toThrow("Unsupported runtime");
  });

  it("executes llm node with text response", async () => {
    completeMock.mockImplementation(() =>
      Promise.resolve({
        content: "Hello from the model",
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 2, outputTokens: 4, totalTokens: 6 },
        latencyMs: 5,
      })
    );

    const node = baseNode("llm");
    node.data = {
      config: {
        model: "gemini-3-flash-preview",
        systemPrompt: "You are helpful.",
        temperature: 0.5,
        maxTokens: 128,
        responseFormat: "text",
        streaming: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: "Say hi",
    });

    expect(result).toBe("Hello from the model");
  });

  it("parses llm json response", async () => {
    completeMock.mockImplementation(() =>
      Promise.resolve({
        content: '```json\n{"name":"Ada"}\n```',
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 2, outputTokens: 4, totalTokens: 6 },
        latencyMs: 5,
      })
    );

    const node = baseNode("llm");
    node.data = {
      config: {
        model: "gemini-3-flash-preview",
        systemPrompt: "",
        temperature: 0.2,
        maxTokens: 64,
        responseFormat: "json",
        streaming: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: "Return JSON",
    });

    expect(result).toEqual({ name: "Ada" });
  });

  it("validates llm structured response", async () => {
    completeMock.mockImplementation(() =>
      Promise.resolve({
        content: '{"ok":true}',
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 2, outputTokens: 4, totalTokens: 6 },
        latencyMs: 5,
      })
    );

    const node = baseNode("llm");
    node.data = {
      config: {
        model: "gemini-3-flash-preview",
        systemPrompt: "",
        temperature: 0,
        maxTokens: 64,
        responseFormat: "structured",
        outputSchema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          additionalProperties: false,
        },
        streaming: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: "Return structured output",
    });

    expect(result).toEqual({ ok: true });
  });

  it("executes agent call node with text output", async () => {
    runAgentMock.mockResolvedValueOnce({ output: "agent reply" });

    const node = baseNode("agent_call");
    node.data = {
      config: {
        agentId: "custom",
        prompt: "Write a summary",
        outputFormat: "text",
        memoryEnabled: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: { topic: "OpenPlane" },
    });

    expect(result).toBe("agent reply");
    const lastCall = runAgentMock.mock.calls.at(-1) as unknown[] | undefined;
    expect(lastCall).toBeDefined();
    const promptArg = lastCall?.[1];
    expect(String(promptArg)).toContain("<task>");
    expect(String(promptArg)).toContain("Write a summary");
    expect(String(promptArg)).toContain("<context>");
  });

  it("executes agent call node with json output", async () => {
    runAgentMock.mockResolvedValueOnce({ output: '{"score":99}' });

    const node = baseNode("agent_call");
    node.data = {
      config: {
        agentId: "custom",
        prompt: "Return JSON",
        outputFormat: "json",
        memoryEnabled: false,
      },
    };

    const result = await executeCanvasNode({
      node,
      input: "Score it",
    });

    expect(result).toEqual({ score: 99 });
  });

  it("executes summarize node", async () => {
    completeMock.mockImplementationOnce(() =>
      Promise.resolve({
        content:
          '{"summary":"Summary text","key_points":["Point A"],"action_items":[{"task":"Do X"}],"entities":[{"text":"OpenPlane","type":"org","count":1}]}',
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 5, outputTokens: 7, totalTokens: 12 },
        latencyMs: 8,
      })
    );

    const node = baseNode("summarize");
    node.data = {
      config: {
        strategy: "stuff",
        outputFormat: "paragraph",
        length: "brief",
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "This is a summary input.",
    })) as SummarizeExecutionResult;

    expect(result.summary).toBe("Summary text");
    expect(result.keyPoints?.length).toBe(1);
    expect(result.actionItems?.length).toBe(1);
    expect(result.entities?.length).toBe(1);
    expect(result.strategyUsed).toBe("stuff");
  });

  it("executes extract node", async () => {
    completeMock.mockImplementationOnce(() =>
      Promise.resolve({
        content:
          '{"values":[{"field":"invoice_number","value":"INV-1","confidence":0.92},{"field":"total","value":1500,"confidence":0.88}],"entities":[{"text":"Acme Corp","type":"organization","start":0,"end":9,"confidence":0.9}]}',
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 10, outputTokens: 12, totalTokens: 22 },
        latencyMs: 6,
      })
    );

    const node = baseNode("extract");
    node.data = {
      config: {
        mode: "schema",
        fields: [
          {
            id: "invoice_number",
            name: "Invoice Number",
            type: "string",
            required: true,
          },
          {
            id: "total",
            name: "Total",
            type: "number",
          },
        ],
        includeConfidence: true,
        extractEntities: true,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "Invoice INV-1 from Acme Corp totaling $1500.",
    })) as ExtractionResult;

    expect(result.values.length).toBe(2);
    expect(result.values[0]?.confidence).toBeDefined();
    expect(result.entities?.length ?? 0).toBeGreaterThan(0);
  });

  it("executes classify node", async () => {
    completeMock.mockImplementationOnce(() =>
      Promise.resolve({
        content:
          '{"results":[{"category_id":"support","confidence":0.93,"reasoning":"Support request"}]}',
        role: "assistant",
        finishReason: "stop",
        usage: { inputTokens: 8, outputTokens: 6, totalTokens: 14 },
        latencyMs: 4,
      })
    );

    const node = baseNode("classify");
    node.data = {
      config: {
        mode: "categories",
        categories: [
          { id: "support", name: "Support" },
          { id: "sales", name: "Sales" },
        ],
        allowMultiple: false,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "Customer needs help resetting their password.",
    })) as ClassifyExecutionResult;

    expect(result.results.length).toBe(1);
    expect(result.results[0]?.categoryId).toBe("support");
    expect(result.isFallback).toBe(false);
  });

  it("executes embeddings node", async () => {
    const node = baseNode("embeddings");
    node.data = {
      config: {
        normalize: true,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "Hello world",
    })) as { embedding: number[] };

    expect(result.embedding[0]).toBeCloseTo(0.6, 5);
    expect(result.embedding[1]).toBeCloseTo(0.8, 5);
  });

  it("executes chunk node", async () => {
    const node = baseNode("chunk");
    node.data = {
      config: {
        strategy: "semantic",
        maxChunkSize: 120,
        overlap: 12,
        preserveStructure: false,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: {
        documents: [
          { id: "doc-1", content: "Hello world." },
          { id: "doc-2", content: "Another doc." },
        ],
      },
    })) as { chunks: Array<{ id: string }>; totalChunks: number };

    expect(result.totalChunks).toBe(2);
    expect(result.chunks[0]?.id).toBe("doc-1-0");
    expect(result.chunks[1]?.id).toBe("doc-2-0");
    expect(chunkDocumentMock.mock.calls.length).toBe(2);
    expect(chunkDocumentMock.mock.calls[0]?.[2]).toEqual({
      strategy: "recursive",
      maxChunkSize: 120,
      chunkOverlap: 12,
      preserveParagraphs: false,
    });
  });

  it("executes merge node with deduplication", async () => {
    const node = baseNode("merge");
    node.data = {
      config: {
        strategy: "deduplicate",
        separator: " | ",
        dedupeThreshold: 1,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: ["Alpha", "Beta", "Alpha"],
    })) as { text: string; parts: string[]; totalParts: number };

    expect(result.text).toBe("Alpha | Beta");
    expect(result.parts).toEqual(["Alpha", "Beta"]);
    expect(result.totalParts).toBe(2);
  });

  it("executes rerank node with fallback ordering", async () => {
    const node = baseNode("rerank");
    node.data = {
      config: {
        topK: 2,
        returnScores: true,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: {
        query: "priority",
        documents: [
          { id: "a", content: "Alpha", score: 0.2 },
          { id: "b", content: "Bravo", score: 0.9 },
        ],
      },
    })) as { documents: Array<{ id: string }> };

    expect(result.documents[0]?.id).toBe("b");
    expect(result.documents[1]?.id).toBe("a");
  });

  it("executes rag node with synthesis", async () => {
    const node = baseNode("rag");
    node.data = {
      config: {
        searchType: "hybrid",
        topK: 5,
        minScore: 0.1,
        model: "gemini-3-flash-preview",
        systemPrompt: "Answer using the context.",
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: { query: "What is in doc?" },
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    })) as RagExecutionResult;

    expect(result.answer).toBe("rag answer");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it("executes rag node without synthesis", async () => {
    const node = baseNode("rag");
    node.data = {
      config: {
        searchType: "hybrid",
        topK: 5,
        minScore: 0.1,
        synthesize: false,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: { query: "Show context", teamId: "team-1" },
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    })) as RagExecutionResult;

    expect(result.answer).toBeUndefined();
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it("executes image node", async () => {
    const node = baseNode("image");
    node.data = {
      config: {
        model: "dall-e-3",
        size: "1024x1024",
        numberOfImages: 1,
        enhancePrompt: false,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "A cat in a studio",
    })) as {
      images: Array<{
        url: string;
        width: number;
        height: number;
        revisedPrompt?: string;
      }>;
      tokenUsage: {
        input: number;
        output: number;
        total: number;
        estimatedCost: number;
      };
      prompt: string;
    };

    expect(result.prompt).toBe("A cat in a studio");
    expect(result.images).toHaveLength(1);
    const image = result.images[0];
    expect(image).toBeDefined();
    if (!image) {
      throw new Error("Image missing");
    }
    expect(image.url).toBe("data:image/png;base64,AQID");
    expect(image.width).toBe(1024);
    expect(image.height).toBe(1024);
    expect(image.revisedPrompt).toBe("Refined");
    expect(result.tokenUsage).toEqual({
      input: 4,
      output: 0,
      total: 4,
      estimatedCost: 0.04,
    });
  });

  it("executes audio node", async () => {
    const node = baseNode("audio");
    node.data = {
      config: {
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        outputFormat: "mp3",
        speed: 1,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "Hello world",
    })) as {
      prompt: string;
      audio: { url: string; format: string; duration: number };
      tokenUsage: { input: number; output: number; total: number };
    };

    expect(result.prompt).toBe("Hello world");
    expect(result.audio.url).toBe("data:audio/mpeg;base64,AQID");
    expect(result.audio.format).toBe("mp3");
    expect(result.audio.duration).toBeGreaterThan(0);
    expect(result.tokenUsage.total).toBe(result.tokenUsage.input);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);
    const call = fetchMock.mock.calls.at(-1) as
      | [unknown, RequestInit?]
      | undefined;
    const body = call?.[1]?.body;
    if (typeof body !== "string") {
      throw new Error("Audio request body missing");
    }
    const parsed = JSON.parse(body) as {
      model: string;
      input: string;
      voice: string;
      response_format: string;
      speed: number;
    };
    expect(parsed).toEqual({
      model: "gpt-4o-mini-tts",
      input: "Hello world",
      voice: "alloy",
      response_format: "mp3",
      speed: 1,
    });
  });

  it("executes video node", async () => {
    const node = baseNode("video");
    node.data = {
      config: {
        model: "sora-2",
        aspectRatio: "16:9",
        duration: 4,
        resolution: "720p",
        fps: 30,
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: "A mountain sunrise in cinematic style",
    })) as {
      prompt: string;
      video: { url: string; width: number; height: number; duration: number };
      tokenUsage: { input: number; output: number; total: number };
    };

    expect(result.prompt).toBe("A mountain sunrise in cinematic style");
    expect(result.video.url).toBe("data:video/mp4;base64,BAUG");
    expect(result.video.width).toBe(1280);
    expect(result.video.height).toBe(720);
    expect(result.video.duration).toBe(4);
    expect(result.tokenUsage.total).toBe(result.tokenUsage.input);

    const createCall = fetchMock.mock.calls.find((call) => {
      const [input, init] = call;
      const url = resolveFetchUrl(input);
      return url.endsWith("/videos") && (init?.method ?? "GET") === "POST";
    }) as [unknown, RequestInit?] | undefined;

    const body = createCall?.[1]?.body;
    if (typeof body !== "string") {
      throw new Error("Video request body missing");
    }
    const parsed = JSON.parse(body) as {
      model: string;
      prompt: string;
      seconds: string;
      size: string;
    };
    expect(parsed).toEqual({
      model: "sora-2",
      prompt: "A mountain sunrise in cinematic style",
      seconds: "4",
      size: "1280x720",
    });
  });

  it("executes connector node via connector action", async () => {
    const node = baseNode("connector");
    node.data = {
      config: {
        connectorId: "connector-1",
        connectorType: "slack",
        operation: "message_send",
        params: {
          channel: "C123",
          text: "Hello",
        },
      },
    };

    const result = (await executeCanvasNode({
      node,
      input: {},
      context: {
        executionId: "exec-1",
        agentCanvasId: "canvas-1",
        versionNumber: 1,
        teamId: "team-1",
        triggeredById: "user-1",
      },
    })) as {
      success: boolean;
      data?: { ts: string; channel: string };
      metrics?: { durationMs: number; retryCount?: number };
    };

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ts: "1711.22", channel: "C123" });
    expect(result.metrics?.durationMs).toBeGreaterThanOrEqual(0);
    expect(sendSlackMessageMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        channel: "C123",
        text: "Hello",
        blocks: undefined,
        threadTs: undefined,
      })
    );
  });

  it("throws on unsupported node type", async () => {
    await expect(
      executeCanvasNode({
        node: baseNode("unsupported" as ExecutionPlanNode["type"]),
        input: { value: 3 },
      })
    ).rejects.toThrow(CanvasNodeExecutorNotFoundError);
  });
});
