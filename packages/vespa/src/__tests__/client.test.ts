import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { VespaClient } from "../client";
import type {
  DetailedHealthStatus,
  FeedResponse,
  GenericDocument,
  QueryMetrics,
  SearchResult,
} from "../schemas";

type FetchImpl = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

const noop = (): void => {
  // intentionally empty for mock
};

const mockFetch = (impl: FetchImpl): void => {
  const mockFn = mock(impl) as unknown as typeof globalThis.fetch;
  mockFn.preconnect = mock(noop);
  globalThis.fetch = mockFn;
};

const createMockDocument = (
  overrides?: Partial<GenericDocument>
): GenericDocument => ({
  id: "doc-123",
  connector_id: "conn-1",
  connector_type: "slack",
  team_id: "team-1",
  workspace_id: "ws-1",
  external_id: "ext-123",
  document_type: "message",
  title: "Test Document",
  content: "Test content for searching",
  created_at: Date.now(),
  updated_at: Date.now(),
  is_public: false,
  ...overrides,
});

const createMockSearchResult = <T = GenericDocument>(
  items: T[] = [],
  coverageOverrides?: Partial<SearchResult<T>["root"]["coverage"]>
): SearchResult<T> => ({
  root: {
    id: "toplevel",
    relevance: 1.0,
    fields: { totalCount: items.length },
    coverage: {
      documents: items.length,
      full: true,
      degraded: {
        "match-phase": false,
        timeout: false,
        "adaptive-timeout": false,
      },
      ...coverageOverrides,
    },
    children: items.map((item, index) => ({
      id: `hit-${index}`,
      relevance: 1.0 - index * 0.1,
      source: "openplane_document",
      fields: item,
    })),
  },
});

const createMockFeedResponse = (id: string): FeedResponse => ({
  pathId: `/document/v1/default/openplane_document/docid/${id}`,
  id: `id:default:openplane_document::${id}`,
});

describe("VespaClient", () => {
  let client: VespaClient;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    client = new VespaClient("http://localhost:8080");
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await client.close();
  });

  describe("constructor", () => {
    test("creates client with default URL", async () => {
      const defaultClient = new VespaClient();
      expect(defaultClient).toBeDefined();
      await defaultClient.close();
    });

    test("creates client with custom URL", async () => {
      const customClient = new VespaClient("http://custom:8080");
      expect(customClient).toBeDefined();
      await customClient.close();
    });

    test("accepts custom connection options", async () => {
      const customClient = new VespaClient("http://localhost:8080", {
        keepAliveTimeout: 60_000,
        keepAliveMaxTimeout: 120_000,
        connections: 20,
        pipelining: 2,
      });
      expect(customClient).toBeDefined();
      await customClient.close();
    });
  });

  describe("close", () => {
    test("closes without error", async () => {
      await expect(client.close()).resolves.toBeUndefined();
    });

    test("can be called multiple times", async () => {
      await client.close();
      await expect(client.close()).resolves.toBeUndefined();
    });
  });

  describe("feedDocument", () => {
    test("feeds document successfully", async () => {
      const doc = createMockDocument();
      const mockResponse = createMockFeedResponse(doc.id);

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.feedDocument(doc);

      expect(result.id).toContain(doc.id);
    });

    test("retries on connection reset", async () => {
      const doc = createMockDocument();
      const mockResponse = createMockFeedResponse(doc.id);
      let callCount = 0;

      mockFetch(() => {
        callCount += 1;
        if (callCount === 1) {
          const error = new Error("ECONNRESET");
          (error as Error & { code: string }).code = "ECONNRESET";
          return Promise.reject(error);
        }
        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const result = await client.feedDocument(doc);

      expect(result.id).toContain(doc.id);
      expect(callCount).toBe(2);
    });

    test("throws after max retries", async () => {
      const doc = createMockDocument();

      mockFetch(() => {
        const error = new Error("ECONNRESET");
        (error as Error & { code: string }).code = "ECONNRESET";
        return Promise.reject(error);
      });

      await expect(client.feedDocument(doc, 1)).rejects.toThrow("ECONNRESET");
    });

    test("throws on non-ok response", async () => {
      const doc = createMockDocument();

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Bad Request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(client.feedDocument(doc)).rejects.toThrow(
        "Vespa feed error"
      );
    });
  });

  describe("feedBatch", () => {
    test("feeds multiple documents", async () => {
      const docs = [
        createMockDocument({ id: "doc-1" }),
        createMockDocument({ id: "doc-2" }),
        createMockDocument({ id: "doc-3" }),
      ];

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop();
        return Promise.resolve(
          new Response(
            JSON.stringify(createMockFeedResponse(id ?? "unknown")),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const results = await client.feedBatch(docs);

      expect(results.length).toBe(3);
    });
  });

  describe("query", () => {
    test("executes simple query", async () => {
      const mockResult = createMockSearchResult([createMockDocument()]);

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.query({
        yql: "select * from openplane_document where true limit 10",
      });

      expect(result.root.children?.length).toBe(1);
      expect(result.root.coverage.full).toBe(true);
    });

    test("executes vector query with POST", async () => {
      const mockResult = createMockSearchResult([createMockDocument()]);
      let capturedMethod: string | undefined;

      mockFetch((_url, init) => {
        capturedMethod = init?.method;
        return Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await client.query({
        yql: "select * from openplane_document where true limit 10",
        query_embedding: {
          type: "tensor<float>(x[1536])",
          values: new Array(1536).fill(0.1),
        },
        ranking: "semantic",
      });

      expect(capturedMethod).toBe("POST");
    });

    test("throws on query error", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Query parse error" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(client.query({ yql: "invalid yql" })).rejects.toThrow(
        "Vespa query error"
      );
    });
  });

  describe("queryWithMetrics", () => {
    test("returns metrics with result", async () => {
      const mockResult = createMockSearchResult([createMockDocument()]);

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const { result, metrics } = await client.queryWithMetrics({
        yql: "select * from openplane_document where true limit 10",
      });

      expect(result.root.children?.length).toBe(1);
      expect(metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.coverage.full).toBe(true);
      expect(metrics.coverage.timeout).toBe(false);
      expect(metrics.resultCount).toBe(1);
    });

    test("captures degraded coverage", async () => {
      const mockResult = createMockSearchResult([createMockDocument()], {
        full: false,
        degraded: {
          "match-phase": false,
          timeout: true,
          "adaptive-timeout": false,
        },
      });

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const { metrics } = await client.queryWithMetrics({
        yql: "select * from openplane_document where true limit 10",
      });

      expect(metrics.coverage.full).toBe(false);
      expect(metrics.coverage.timeout).toBe(true);
    });
  });

  describe("deleteDocument", () => {
    test("deletes document successfully", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 200 })));

      await expect(client.deleteDocument("doc-123")).resolves.toBeUndefined();
    });

    test("throws on delete error", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Not found" }), {
            status: 404,
          })
        )
      );

      await expect(client.deleteDocument("doc-123")).rejects.toThrow(
        "Vespa delete error"
      );
    });
  });

  describe("getDocument", () => {
    test("returns document when found", async () => {
      const doc = createMockDocument();

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ fields: doc }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.getDocument("doc-123");

      expect(result).toBeDefined();
      expect(result?.id).toBe(doc.id);
    });

    test("returns null when not found", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 404 })));

      const result = await client.getDocument("doc-123");

      expect(result).toBeNull();
    });
  });

  describe("updateDocument", () => {
    test("updates document successfully", async () => {
      const mockResponse = createMockFeedResponse("doc-123");

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.updateDocument("doc-123", {
        title: "Updated Title",
      });

      expect(result.id).toContain("doc-123");
    });
  });

  describe("partialUpdateDocument", () => {
    test("creates partial update payload correctly", async () => {
      const mockResponse = createMockFeedResponse("doc-123");
      let capturedBody: string | undefined;

      mockFetch((_url, init) => {
        capturedBody = init?.body as string;
        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await client.partialUpdateDocument("doc-123", {
        title: "Updated Title",
        view_count: 10,
      });

      const body = JSON.parse(capturedBody ?? "{}");
      expect(body.fields.title).toEqual({ assign: "Updated Title" });
      expect(body.fields.view_count).toEqual({ assign: 10 });
    });

    test("skips undefined fields", async () => {
      const mockResponse = createMockFeedResponse("doc-123");
      let capturedBody: string | undefined;

      mockFetch((_url, init) => {
        capturedBody = init?.body as string;
        return Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await client.partialUpdateDocument("doc-123", {
        title: "Updated Title",
        content: undefined,
      });

      const body = JSON.parse(capturedBody ?? "{}");
      expect(body.fields.title).toEqual({ assign: "Updated Title" });
      expect(body.fields.content).toBeUndefined();
    });
  });

  describe("healthCheck", () => {
    test("returns true when healthy", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 200 })));

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    test("returns false when unhealthy", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 503 })));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    test("returns false on network error", async () => {
      mockFetch(() => Promise.reject(new Error("Network error")));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("healthCheckDetailed", () => {
    test("returns detailed status when fully healthy", async () => {
      const mockResult = createMockSearchResult([createMockDocument()]);

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        if (urlString.includes("ApplicationStatus")) {
          return Promise.resolve(new Response(null, { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const result = await client.healthCheckDetailed();

      expect(result.healthy).toBe(true);
      expect(result.containerUp).toBe(true);
      expect(result.contentUp).toBe(true);
      expect(result.searchLatencyMs).toBeGreaterThanOrEqual(0);
    });

    test("returns unhealthy when container is down", async () => {
      mockFetch(() => Promise.resolve(new Response(null, { status: 503 })));

      const result = await client.healthCheckDetailed();

      expect(result.healthy).toBe(false);
      expect(result.containerUp).toBe(false);
    });

    test("returns unhealthy on network error", async () => {
      mockFetch(() => Promise.reject(new Error("Connection refused")));

      const result = await client.healthCheckDetailed();

      expect(result.healthy).toBe(false);
    });
  });

  describe("deleteByConnectorId", () => {
    test("deletes documents by connector ID", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ documentCount: 10 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.deleteByConnectorId(
        "conn-123",
        "openplane_document"
      );

      expect(result.deleted).toBe(10);
    });

    test("handles zero deletions", async () => {
      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.deleteByConnectorId(
        "conn-123",
        "openplane_document"
      );

      expect(result.deleted).toBe(0);
    });
  });

  describe("queryByThreadId", () => {
    test("queries documents by thread ID", async () => {
      const mockResult = createMockSearchResult([
        createMockDocument({ thread_id: "thread-123" }),
      ]);

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.queryByThreadId("thread-123", "conn-1");

      expect(result.root.children?.length).toBe(1);
    });
  });

  describe("queryByParentId", () => {
    test("queries documents by parent ID", async () => {
      const mockResult = createMockSearchResult([
        createMockDocument({ parent_id: "parent-123" }),
      ]);

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockResult), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await client.queryByParentId("parent-123", "conn-1");

      expect(result.root.children?.length).toBe(1);
    });
  });
});

describe("QueryMetrics type", () => {
  test("has correct shape", () => {
    const metrics: QueryMetrics = {
      latencyMs: 50,
      coverage: {
        full: true,
        timeout: false,
        matchPhase: false,
      },
      resultCount: 10,
    };

    expect(metrics.latencyMs).toBe(50);
    expect(metrics.coverage.full).toBe(true);
    expect(metrics.coverage.timeout).toBe(false);
    expect(metrics.coverage.matchPhase).toBe(false);
    expect(metrics.resultCount).toBe(10);
  });

  test("handles degraded coverage", () => {
    const metrics: QueryMetrics = {
      latencyMs: 5000,
      coverage: {
        full: false,
        timeout: true,
        matchPhase: false,
      },
      resultCount: 50,
    };

    expect(metrics.coverage.full).toBe(false);
    expect(metrics.coverage.timeout).toBe(true);
  });
});

describe("DetailedHealthStatus type", () => {
  test("has correct shape for healthy status", () => {
    const status: DetailedHealthStatus = {
      healthy: true,
      containerUp: true,
      contentUp: true,
      searchLatencyMs: 25,
      documentCount: 1000,
    };

    expect(status.healthy).toBe(true);
    expect(status.containerUp).toBe(true);
    expect(status.contentUp).toBe(true);
    expect(status.searchLatencyMs).toBe(25);
    expect(status.documentCount).toBe(1000);
  });

  test("has correct shape for unhealthy status", () => {
    const status: DetailedHealthStatus = {
      healthy: false,
      containerUp: false,
      contentUp: false,
      searchLatencyMs: -1,
    };

    expect(status.healthy).toBe(false);
    expect(status.containerUp).toBe(false);
    expect(status.contentUp).toBe(false);
    expect(status.searchLatencyMs).toBe(-1);
    expect(status.documentCount).toBeUndefined();
  });

  test("partial failure: container up but content down", () => {
    const status: DetailedHealthStatus = {
      healthy: false,
      containerUp: true,
      contentUp: false,
      searchLatencyMs: -1,
    };

    expect(status.healthy).toBe(false);
    expect(status.containerUp).toBe(true);
    expect(status.contentUp).toBe(false);
  });
});
