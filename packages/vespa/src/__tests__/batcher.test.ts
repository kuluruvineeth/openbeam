import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { VespaBatcher } from "../batcher";
import type { FeedResponse, GenericDocument } from "../schemas";

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
  id: `doc-${Math.random().toString(36).slice(2)}`,
  connector_id: "conn-1",
  connector_type: "slack",
  team_id: "team-1",
  workspace_id: "ws-1",
  external_id: "ext-123",
  document_type: "message",
  title: "Test Document",
  content: "Test content",
  created_at: Date.now(),
  updated_at: Date.now(),
  is_public: false,
  ...overrides,
});

const createMockFeedResponse = (id: string): FeedResponse => ({
  pathId: `/document/v1/default/openbeam_document/docid/${id}`,
  id: `id:default:openbeam_document::${id}`,
});

describe("VespaBatcher", () => {
  let batcher: VespaBatcher;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("constructor", () => {
    test("creates batcher with default config", () => {
      batcher = new VespaBatcher();
      expect(batcher).toBeDefined();
      expect(batcher.pendingCount).toBe(0);
      expect(batcher.isIdle).toBe(true);
    });

    test("creates batcher with custom config", () => {
      batcher = new VespaBatcher({
        maxBatchSize: 100,
        flushIntervalMs: 50,
        maxConcurrent: 8,
      });
      expect(batcher).toBeDefined();
    });
  });

  describe("add", () => {
    test("queues document for batching", async () => {
      batcher = new VespaBatcher({ flushIntervalMs: 1000 });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const doc = createMockDocument({ id: "doc-1" });
      const promise = batcher.add(doc);

      expect(batcher.pendingCount).toBe(1);
      expect(batcher.isIdle).toBe(false);

      await batcher.forceFlush();
      const result = await promise;

      expect(result.id).toContain("doc-1");
      expect(batcher.pendingCount).toBe(0);
      expect(batcher.isIdle).toBe(true);
    });

    test("flushes when batch size is reached", async () => {
      batcher = new VespaBatcher({
        maxBatchSize: 2,
        flushIntervalMs: 10_000,
      });

      let feedCount = 0;
      mockFetch((url) => {
        feedCount += 1;
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const promises = [
        batcher.add(createMockDocument({ id: "doc-1" })),
        batcher.add(createMockDocument({ id: "doc-2" })),
      ];

      await Promise.all(promises);

      expect(feedCount).toBe(2);
    });

    test("flushes on timer when batch size not reached", async () => {
      batcher = new VespaBatcher({
        maxBatchSize: 100,
        flushIntervalMs: 10,
      });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const promise = batcher.add(createMockDocument({ id: "doc-1" }));
      const result = await promise;

      expect(result.id).toContain("doc-1");
    });
  });

  describe("addMany", () => {
    test("queues multiple documents", async () => {
      batcher = new VespaBatcher({ flushIntervalMs: 1000 });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const docs = [
        createMockDocument({ id: "doc-1" }),
        createMockDocument({ id: "doc-2" }),
        createMockDocument({ id: "doc-3" }),
      ];

      const promise = batcher.addMany(docs);

      expect(batcher.pendingCount).toBe(3);

      await batcher.forceFlush();
      const results = await promise;

      expect(results.length).toBe(3);
    });
  });

  describe("forceFlush", () => {
    test("flushes all pending documents immediately", async () => {
      batcher = new VespaBatcher({ flushIntervalMs: 10_000 });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const promises = [
        batcher.add(createMockDocument({ id: "doc-1" })),
        batcher.add(createMockDocument({ id: "doc-2" })),
      ];

      expect(batcher.pendingCount).toBe(2);

      await batcher.forceFlush();

      expect(batcher.pendingCount).toBe(0);
      expect(batcher.isIdle).toBe(true);

      const results = await Promise.all(promises);
      expect(results.length).toBe(2);
    });

    test("handles empty buffer", async () => {
      batcher = new VespaBatcher();

      await expect(batcher.forceFlush()).resolves.toBeUndefined();
    });
  });

  describe("error handling", () => {
    test("rejects individual document on feed error", async () => {
      batcher = new VespaBatcher({ flushIntervalMs: 10 });

      mockFetch(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Feed failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const promise = batcher.add(createMockDocument({ id: "doc-1" }));

      await expect(promise).rejects.toThrow();
    });

    test("handles mixed success and failure", async () => {
      batcher = new VespaBatcher({
        maxBatchSize: 2,
        flushIntervalMs: 10_000,
      });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";

        if (id === "doc-fail") {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Feed failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const successPromise = batcher.add(createMockDocument({ id: "doc-1" }));
      const failPromise = batcher.add(createMockDocument({ id: "doc-fail" }));

      const [successResult, failResult] = await Promise.allSettled([
        successPromise,
        failPromise,
      ]);

      expect(successResult.status).toBe("fulfilled");
      expect(failResult.status).toBe("rejected");
    });
  });

  describe("concurrency", () => {
    test("respects maxConcurrent limit", async () => {
      batcher = new VespaBatcher({
        maxBatchSize: 2,
        flushIntervalMs: 10_000,
        maxConcurrent: 1,
      });

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockFetch(async (url) => {
        concurrentCalls += 1;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);

        await new Promise((resolve) => setTimeout(resolve, 10));

        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";

        concurrentCalls -= 1;

        return new Response(JSON.stringify(createMockFeedResponse(id)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const promises = [
        batcher.add(createMockDocument({ id: "doc-1" })),
        batcher.add(createMockDocument({ id: "doc-2" })),
        batcher.add(createMockDocument({ id: "doc-3" })),
        batcher.add(createMockDocument({ id: "doc-4" })),
      ];

      await Promise.all(promises);

      expect(maxConcurrentCalls).toBeLessThanOrEqual(2);
    });
  });

  describe("pendingCount", () => {
    test("tracks pending documents correctly", async () => {
      batcher = new VespaBatcher({ flushIntervalMs: 10_000 });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      expect(batcher.pendingCount).toBe(0);

      batcher.add(createMockDocument({ id: "doc-1" }));
      expect(batcher.pendingCount).toBe(1);

      batcher.add(createMockDocument({ id: "doc-2" }));
      expect(batcher.pendingCount).toBe(2);

      await batcher.forceFlush();
      expect(batcher.pendingCount).toBe(0);
    });
  });

  describe("isIdle", () => {
    test("returns true when no pending work", () => {
      batcher = new VespaBatcher();
      expect(batcher.isIdle).toBe(true);
    });

    test("returns false when documents are pending", () => {
      batcher = new VespaBatcher({ flushIntervalMs: 10_000 });

      mockFetch((url) => {
        const urlString = typeof url === "string" ? url : url.toString();
        const id = urlString.split("/").pop() ?? "unknown";
        return Promise.resolve(
          new Response(JSON.stringify(createMockFeedResponse(id)), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      batcher.add(createMockDocument());
      expect(batcher.isIdle).toBe(false);

      batcher.forceFlush();
    });
  });
});
