import { afterEach, describe, expect, mock, test } from "bun:test";

const embedQueryWithCacheMock = mock(() => Promise.resolve([0.1, 0.2]));

const findSimilarMock = mock(() =>
  Promise.resolve({
    entry: {
      response: {
        citations: [],
        answer: "cached answer",
        groundingScore: 0.9,
      },
    },
    similarity: 0.95,
  })
);

mock.module("@openplane/ai", () => ({
  embedQueryWithCache: embedQueryWithCacheMock,
  embedQuery: mock(() => Promise.resolve([0.1, 0.2])),
  getConfig: () => ({
    defaultProvider: "google",
    defaultChatModel: "test",
    defaultEmbeddingModel: "test",
    providers: {
      openai: {},
      anthropic: {},
      google: {},
      azure: {},
      ollama: { baseURL: "" },
    },
    embedding: { dimensions: 1, maxTokens: 1, batchSize: 1 },
    completion: { temperature: 0, maxTokens: 1, topP: 1 },
    agent: {
      maxSteps: 1,
      maxTokensPerStep: 1,
      timeoutMs: 1,
      maxToolRoundtrips: 1,
      enableParallelTools: false,
    },
    engine: { baseURL: "", gpuURL: "", timeout: 1 },
  }),
  streamCompletion: mock(() => {
    throw new Error("streamCompletion should not be called on cache hit");
  }),
  getBGEM3Provider: () => ({}),
  isReasoningChunk: () => false,
  isReasoningDeltaChunk: () => false,
  extractReasoningContent: () => "",
  buildThinkingProviderOptions: () => ({}),
  getProviderOptionsForModel: () => ({}),
  registry: { languageModel: () => null, textEmbeddingModel: () => null },
  estimateTokens: () => 0,
}));

mock.module("@openplane/redis", () => ({
  Cache: () => {
    /* mock */
  },
  cache: {},
  getSemanticCache: () => ({
    findSimilar: findSimilarMock,
    store: mock(() => Promise.resolve()),
  }),
  getSearchCache: () => ({
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve()),
  }),
}));

mock.module("../../search/service", () => ({
  searchService: {
    getDocumentsByIds: mock(() => Promise.resolve([])),
    searchUnified: mock(() => Promise.resolve({ items: [], total: 0 })),
  },
}));

describe("generateOverview semantic cache hit timing", () => {
  type GlobalThisWithPerformance = typeof globalThis & {
    performance?: {
      now: () => number;
    };
  };
  const globalWithPerformance = globalThis as GlobalThisWithPerformance;
  const originalPerformance = globalWithPerformance.performance;

  afterEach(() => {
    Object.defineProperty(globalWithPerformance, "performance", {
      value: originalPerformance,
      configurable: true,
    });
  });

  test("uses generateOverview startTime for totalMs on cache hit (not cacheCheckStart)", async () => {
    const values = [1000, 1100, 1150, 1200];
    const nowMock = mock(() => values.shift() ?? 1200);

    Object.defineProperty(globalWithPerformance, "performance", {
      value: { now: nowMock },
      configurable: true,
    });

    const { generateOverview } = await import("../orchestrator");

    const res = await generateOverview({
      teamId: "team-1",
      query: "q",
      accessControlIds: [],
      maxSources: 5,
      enableFanout: false,
      temperature: 0.2,
    });

    expect(res.content).toBe("cached answer");
    expect(res.timing.cacheCheckMs).toBe(50);
    expect(res.timing.totalMs).toBe(200);
  });
});
