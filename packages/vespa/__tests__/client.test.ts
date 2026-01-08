import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { VespaClient } from "../src/client";

const MOCK_SEARCH_RESULT = {
  root: {
    id: "toplevel",
    relevance: 1.0,
    fields: { totalCount: 1 },
    coverage: {
      documents: 100,
      full: true,
      degraded: {
        "match-phase": false,
        timeout: false,
        "adaptive-timeout": false,
      },
    },
    children: [
      {
        id: "doc1",
        relevance: 0.95,
        source: "openplane_document",
        fields: {
          id: "doc1",
          title: "Test Document",
          content: "Test content",
          connector_id: "conn1",
          connector_type: "slack",
          team_id: "team1",
          workspace_id: "ws1",
          external_id: "ext1",
          document_type: "message",
          created_at: Date.now(),
          updated_at: Date.now(),
          is_public: false,
        },
      },
    ],
  },
};

const MOCK_HEALTH_RESPONSE = { status: "OK" };

describe("VespaClient", () => {
  let client: VespaClient;

  beforeEach(() => {
    client = new VespaClient("http://localhost:8080");
  });

  afterEach(() => {
    client.close();
  });

  describe("constructor", () => {
    it("uses default URL when none provided", () => {
      const defaultClient = new VespaClient();
      expect(defaultClient).toBeDefined();
      defaultClient.close();
    });

    it("accepts custom connection options", () => {
      const customClient = new VespaClient("http://localhost:8080", {
        keepAliveTimeout: 60_000,
        connections: 20,
        pipelining: 2,
      });
      expect(customClient).toBeDefined();
      customClient.close();
    });
  });

  describe("healthCheck", () => {
    it("returns true when container responds with ok", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_HEALTH_RESPONSE), { status: 200 })
        )
      );

      const result = await client.healthCheck();
      expect(result).toBe(true);

      globalThis.fetch = originalFetch;
    });

    it("returns false when container returns error", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Internal Error", { status: 500 }))
      );

      const result = await client.healthCheck();
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });

    it("returns false when network error occurs", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() => Promise.reject(new Error("ECONNREFUSED")));

      const result = await client.healthCheck();
      expect(result).toBe(false);

      globalThis.fetch = originalFetch;
    });
  });

  describe("healthCheckDetailed", () => {
    it("returns healthy status when all checks pass", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        )
      );

      const result = await client.healthCheckDetailed();
      expect(result.healthy).toBe(true);
      expect(result.containerUp).toBe(true);
      expect(result.contentUp).toBe(true);
      expect(result.searchLatencyMs).toBeGreaterThanOrEqual(0);

      globalThis.fetch = originalFetch;
    });

    it("returns unhealthy status when container check fails", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Internal Error", { status: 500 }))
      );

      const result = await client.healthCheckDetailed();
      expect(result.healthy).toBe(false);
      expect(result.containerUp).toBe(false);

      globalThis.fetch = originalFetch;
    });
  });

  describe("query", () => {
    it("executes simple query via GET", async () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        )
      );
      globalThis.fetch = fetchMock;

      const result = await client.query({
        yql: "select * from openplane_document where true",
        hits: 10,
      });

      expect(result.root.children).toHaveLength(1);
      expect(result.root.children?.[0].fields.id).toBe("doc1");

      globalThis.fetch = originalFetch;
    });

    it("executes vector query via POST when embeddings present", async () => {
      const originalFetch = globalThis.fetch;
      const fetchMock = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        )
      );
      globalThis.fetch = fetchMock;

      const result = await client.query({
        yql: "select * from openplane_document where true",
        hits: 10,
        query_embedding: {
          type: "tensor<float>(x[1536])",
          values: new Array(1536).fill(0),
        },
      });

      expect(result.root.children).toHaveLength(1);

      globalThis.fetch = originalFetch;
    });

    it("throws error on non-ok response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Query failed" }), {
            status: 400,
          })
        )
      );

      await expect(
        client.query({ yql: "select * from openplane_document where true" })
      ).rejects.toThrow("Vespa query error");

      globalThis.fetch = originalFetch;
    });
  });

  describe("queryWithMetrics", () => {
    it("returns metrics alongside results", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        )
      );

      const { result, metrics } = await client.queryWithMetrics({
        yql: "select * from openplane_document where true",
      });

      expect(result.root.children).toHaveLength(1);
      expect(metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(metrics.coverage.full).toBe(true);
      expect(metrics.coverage.timeout).toBe(false);
      expect(metrics.coverage.matchPhase).toBe(false);
      expect(metrics.resultCount).toBe(1);

      globalThis.fetch = originalFetch;
    });
  });

  describe("queryBatch", () => {
    it("executes multiple queries in parallel", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        )
      );

      const results = await client.queryBatch([
        { yql: "select * from openplane_document where true", hits: 5 },
        { yql: "select * from openplane_document where true", hits: 10 },
        { yql: "select * from openplane_document where true", hits: 15 },
      ]);

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(result.root.children).toHaveLength(1);
      }

      globalThis.fetch = originalFetch;
    });
  });

  describe("feedDocument", () => {
    it("successfully feeds document on first try", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ pathId: "/doc", id: "doc1" }), {
            status: 200,
          })
        )
      );

      const doc = {
        id: "doc1",
        title: "Test",
        content: "Content",
        connector_id: "conn1",
        connector_type: "slack",
        team_id: "team1",
        workspace_id: "ws1",
        external_id: "ext1",
        document_type: "message",
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: false,
      };

      const result = await client.feedDocument(doc);
      expect(result.id).toBe("doc1");

      globalThis.fetch = originalFetch;
    });

    it("throws on non-retryable error immediately", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Validation failed" }), {
            status: 400,
          })
        )
      );

      const doc = {
        id: "doc1",
        title: "Test",
        content: "Content",
        connector_id: "conn1",
        connector_type: "slack",
        team_id: "team1",
        workspace_id: "ws1",
        external_id: "ext1",
        document_type: "message",
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: false,
      };

      await expect(client.feedDocument(doc, 1)).rejects.toThrow(
        "Vespa feed error"
      );

      globalThis.fetch = originalFetch;
    });

    it("converts metadata object to JSON string", async () => {
      const originalFetch = globalThis.fetch;
      let capturedBody: string | undefined;
      globalThis.fetch = mock((_url: unknown, options: { body?: string }) => {
        capturedBody = options?.body;
        return Promise.resolve(
          new Response(JSON.stringify({ pathId: "/doc", id: "doc1" }), {
            status: 200,
          })
        );
      });

      const doc = {
        id: "doc1",
        title: "Test",
        content: "Content",
        connector_id: "conn1",
        connector_type: "slack",
        team_id: "team1",
        workspace_id: "ws1",
        external_id: "ext1",
        document_type: "message",
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: false,
        metadata: { key: "value" },
      };

      await client.feedDocument(doc);
      const parsed = JSON.parse(capturedBody ?? "{}");
      expect(parsed.fields.metadata).toBe('{"key":"value"}');

      globalThis.fetch = originalFetch;
    });
  });

  describe("deleteDocument", () => {
    it("successfully deletes document", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 200 }))
      );

      await expect(client.deleteDocument("doc1")).resolves.toBeUndefined();

      globalThis.fetch = originalFetch;
    });

    it("throws error on failure", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Not found" }), {
            status: 404,
          })
        )
      );

      await expect(client.deleteDocument("doc1")).rejects.toThrow(
        "Vespa delete error"
      );

      globalThis.fetch = originalFetch;
    });
  });

  describe("getDocument", () => {
    it("returns document when found", async () => {
      const originalFetch = globalThis.fetch;
      const docFields = {
        id: "doc1",
        title: "Test",
        content: "Content",
        connector_id: "conn1",
        connector_type: "slack",
        team_id: "team1",
        workspace_id: "ws1",
        external_id: "ext1",
        document_type: "message",
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: false,
      };
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ fields: docFields }), { status: 200 })
        )
      );

      const result = await client.getDocument("doc1");
      expect(result?.id).toBe("doc1");
      expect(result?.title).toBe("Test");

      globalThis.fetch = originalFetch;
    });

    it("returns null when document not found", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(null, { status: 404 }))
      );

      const result = await client.getDocument("nonexistent");
      expect(result).toBeNull();

      globalThis.fetch = originalFetch;
    });
  });

  describe("close", () => {
    it("can be called multiple times safely", () => {
      const testClient = new VespaClient();
      expect(() => {
        testClient.close();
        testClient.close();
      }).not.toThrow();
    });
  });

  describe("visitDocuments", () => {
    it("iterates through all document batches", async () => {
      const originalFetch = globalThis.fetch;
      let callCount = 0;
      globalThis.fetch = mock(() => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                documents: [
                  { id: "doc1", fields: { id: "doc1", title: "Doc 1" } },
                  { id: "doc2", fields: { id: "doc2", title: "Doc 2" } },
                ],
                continuation: "token1",
              }),
              { status: 200 }
            )
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              documents: [
                { id: "doc3", fields: { id: "doc3", title: "Doc 3" } },
              ],
            }),
            { status: 200 }
          )
        );
      });

      const batches: unknown[][] = [];
      for await (const batch of client.visitDocuments({})) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(2);
      expect(batches[1]).toHaveLength(1);

      globalThis.fetch = originalFetch;
    });

    it("handles selection filter", async () => {
      const originalFetch = globalThis.fetch;
      let capturedUrl: string | undefined;
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(
          new Response(JSON.stringify({ documents: [] }), { status: 200 })
        );
      });

      const batches: unknown[][] = [];
      for await (const batch of client.visitDocuments({
        selection: 'team_id=="team1"',
      })) {
        batches.push(batch);
      }

      expect(capturedUrl).toContain("selection=");
      expect(capturedUrl).toContain("team_id");

      globalThis.fetch = originalFetch;
    });
  });

  describe("feedDocumentAsync", () => {
    it("returns operation ID", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "operation-123" }), { status: 200 })
        )
      );

      const doc = {
        id: "doc1",
        title: "Test",
        content: "Content",
        connector_id: "conn1",
        connector_type: "slack",
        team_id: "team1",
        workspace_id: "ws1",
        external_id: "ext1",
        document_type: "message",
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: false,
      };

      const result = await client.feedDocumentAsync(doc);
      expect(result.operationId).toBe("operation-123");

      globalThis.fetch = originalFetch;
    });
  });

  describe("queryCached", () => {
    it("returns cached result on second call", async () => {
      const cachedClient = new VespaClient("http://localhost:8080", {
        enableCache: true,
        cacheTtlMs: 30_000,
        cacheMaxSize: 100,
      });

      const originalFetch = globalThis.fetch;
      let fetchCallCount = 0;
      globalThis.fetch = mock(() => {
        fetchCallCount += 1;
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        );
      });

      const params = {
        yql: "select * from openplane_document where true",
        hits: 10,
      };

      const result1 = await cachedClient.queryCached(params);
      const result2 = await cachedClient.queryCached(params);

      expect(result1.root.children).toHaveLength(1);
      expect(result2.root.children).toHaveLength(1);
      expect(fetchCallCount).toBe(1);

      cachedClient.close();
      globalThis.fetch = originalFetch;
    });

    it("falls back to regular query when cache disabled", async () => {
      const originalFetch = globalThis.fetch;
      let fetchCallCount = 0;
      globalThis.fetch = mock(() => {
        fetchCallCount += 1;
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        );
      });

      const params = {
        yql: "select * from openplane_document where true",
        hits: 10,
      };

      await client.queryCached(params);
      await client.queryCached(params);

      expect(fetchCallCount).toBe(2);

      globalThis.fetch = originalFetch;
    });

    it("caches different queries separately", async () => {
      const cachedClient = new VespaClient("http://localhost:8080", {
        enableCache: true,
      });

      const originalFetch = globalThis.fetch;
      let fetchCallCount = 0;
      globalThis.fetch = mock(() => {
        fetchCallCount += 1;
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_SEARCH_RESULT), { status: 200 })
        );
      });

      await cachedClient.queryCached({
        yql: "select * from openplane_document where id='1'",
      });
      await cachedClient.queryCached({
        yql: "select * from openplane_document where id='2'",
      });
      await cachedClient.queryCached({
        yql: "select * from openplane_document where id='1'",
      });

      expect(fetchCallCount).toBe(2);

      cachedClient.close();
      globalThis.fetch = originalFetch;
    });
  });
});
