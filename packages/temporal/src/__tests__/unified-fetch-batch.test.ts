import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@temporalio/activity", () => ({
  heartbeat: vi.fn(),
}));

vi.mock("@temporalio/common", () => ({
  ApplicationFailure: {
    nonRetryable: (msg: string, type: string) => {
      const err = new Error(msg);
      err.name = type;
      return err;
    },
  },
}));

import type { GenericDocument } from "@openbeam/vespa";
import type {
  ConnectorRecord,
  FetchBatchOutput,
} from "../activities/connectors/types";
import {
  clearGeneratorCache,
  createUnifiedFetchBatchActivity,
  registerSyncFactory,
} from "../activities/connectors/unified-fetch-batch";
import type { SyncCursor } from "../workflows/types";

function makeConnector(
  overrides: Partial<ConnectorRecord> = {}
): ConnectorRecord {
  return {
    id: "conn-test",
    type: "TEST_MULTI_STAGE",
    teamId: "team-1",
    status: "ACTIVE",
    workspaceExternalId: "ws-1",
    syncMode: "FULL",
    lastSyncedAt: null,
    config: {},
    ...overrides,
  };
}

function makeDoc(id: string): GenericDocument {
  return {
    id,
    title: `Doc ${id}`,
    content: `Content ${id}`,
    connector_id: "conn-test",
    connector_type: "TEST_MULTI_STAGE",
    team_id: "team-1",
    workspace_id: "ws-1",
    external_id: id,
    document_type: "message",
    created_at: Date.now(),
    updated_at: Date.now(),
    is_public: true,
    metadata: {},
  };
}

describe("unified-fetch-batch multi-stage generator", () => {
  beforeEach(() => {
    clearGeneratorCache();
  });

  it("completes all stages of a multi-stage generator without premature exit", async () => {
    registerSyncFactory(
      "TEST_MULTI_STAGE",
      async function* (_connectorId, _connector, _cursor) {
        await Promise.resolve();
        yield {
          items: [makeDoc("msg-1"), makeDoc("msg-2")],
          cursor: { lastSyncTime: 1 } as SyncCursor,
          hasMore: true,
        };

        yield {
          items: [makeDoc("msg-3")],
          cursor: { lastSyncTime: 2 } as SyncCursor,
          hasMore: false,
        };

        yield {
          items: [],
          cursor: { lastFileSyncTimestamp: "123" } as SyncCursor,
          hasMore: true,
          discoveredResources: [
            {
              externalId: "file-1",
              resourceType: "file",
              name: "test.pdf",
              metadata: {},
            },
          ],
        };

        yield {
          items: [],
          cursor: { lastFileSyncTimestamp: "456" } as SyncCursor,
          hasMore: false,
          discoveredResources: [
            {
              externalId: "file-2",
              resourceType: "video",
              name: "clip.mp4",
              metadata: {},
            },
          ],
        };

        yield {
          items: [makeDoc("canvas-1")],
          cursor: { lastCanvasSyncTimestamp: "789" } as SyncCursor,
          hasMore: false,
        };
      }
    );

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();
    const batches: FetchBatchOutput[] = [];

    for (let i = 0; i < 20; i += 1) {
      const result = await activity.fetchBatch({
        connector,
        batchSize: 100,
      });
      batches.push(result);
      if (!result.hasMore) {
        break;
      }
    }

    expect(batches).toHaveLength(6);

    expect(batches[0].items).toHaveLength(2);
    expect(batches[0].hasMore).toBe(true);

    expect(batches[1].items).toHaveLength(1);
    expect(batches[1].hasMore).toBe(true);

    expect(batches[2].items).toHaveLength(0);
    expect(batches[2].hasMore).toBe(true);
    expect(batches[2].discoveredResources).toHaveLength(1);
    expect(batches[2].discoveredResources?.[0].externalId).toBe("file-1");

    expect(batches[3].items).toHaveLength(0);
    expect(batches[3].hasMore).toBe(true);
    expect(batches[3].discoveredResources).toHaveLength(1);
    expect(batches[3].discoveredResources?.[0].externalId).toBe("file-2");

    expect(batches[4].items).toHaveLength(1);
    expect(batches[4].items[0].id).toBe("canvas-1");
    expect(batches[4].hasMore).toBe(true);

    expect(batches[5].items).toHaveLength(0);
    expect(batches[5].hasMore).toBe(false);
  });

  it("never returns hasMore=false for intermediate batches even if inner stage says so", async () => {
    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      yield { items: [makeDoc("a")], hasMore: false };
      yield { items: [makeDoc("b")], hasMore: false };
      yield { items: [makeDoc("c")], hasMore: false };
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();
    const results: FetchBatchOutput[] = [];

    for (let i = 0; i < 10; i += 1) {
      const result = await activity.fetchBatch({ connector, batchSize: 100 });
      results.push(result);
      if (!result.hasMore) {
        break;
      }
    }

    expect(results).toHaveLength(4);
    expect(results[0].hasMore).toBe(true);
    expect(results[0].items[0].id).toBe("a");
    expect(results[1].hasMore).toBe(true);
    expect(results[1].items[0].id).toBe("b");
    expect(results[2].hasMore).toBe(true);
    expect(results[2].items[0].id).toBe("c");
    expect(results[3].hasMore).toBe(false);
    expect(results[3].items).toHaveLength(0);
  });

  it("does not recreate generator between fetchBatch calls", async () => {
    let creationCount = 0;

    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      creationCount += 1;
      yield { items: [makeDoc("1")], hasMore: true };
      yield { items: [makeDoc("2")], hasMore: false };
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();

    await activity.fetchBatch({ connector, batchSize: 100 });
    await activity.fetchBatch({ connector, batchSize: 100 });
    await activity.fetchBatch({ connector, batchSize: 100 });

    expect(creationCount).toBe(1);
  });

  it("cleans up generator only after done", async () => {
    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      yield { items: [makeDoc("1")], hasMore: true };
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();

    const batch1 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(batch1.items).toHaveLength(1);
    expect(batch1.hasMore).toBe(true);

    const batch2 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(batch2.items).toHaveLength(0);
    expect(batch2.hasMore).toBe(false);

    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      yield { items: [makeDoc("new-1")], hasMore: true };
    });

    const batch3 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(batch3.items).toHaveLength(1);
    expect(batch3.items[0].id).toBe("new-1");
  });

  it("simulates exact Slack pattern: messages → files(empty) → canvases → done", async () => {
    const discoveredFiles = [
      { externalId: "f1", resourceType: "file", name: "doc.pdf", metadata: {} },
      {
        externalId: "f2",
        resourceType: "video",
        name: "clip.mp4",
        metadata: {},
      },
    ];

    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      yield {
        items: Array.from({ length: 61 }, (_, i) => makeDoc(`ch1-msg-${i}`)),
        cursor: { channelCursors: { C1: "ts1" } } as unknown as SyncCursor,
        hasMore: true,
      };

      yield {
        items: Array.from({ length: 29 }, (_, i) => makeDoc(`ch2-msg-${i}`)),
        cursor: {
          channelCursors: { C1: "ts1", C2: "ts2" },
        } as unknown as SyncCursor,
        hasMore: true,
      };

      yield {
        items: Array.from({ length: 32 }, (_, i) => makeDoc(`ch3-msg-${i}`)),
        cursor: {
          channelCursors: { C1: "ts1", C2: "ts2", C3: "ts3" },
        } as unknown as SyncCursor,
        hasMore: false,
      };

      yield {
        items: [],
        cursor: { lastFileSyncTimestamp: "100" } as SyncCursor,
        hasMore: true,
        discoveredResources: discoveredFiles,
      };

      yield {
        items: [],
        cursor: { lastFileSyncTimestamp: "200" } as SyncCursor,
        hasMore: false,
      };

      yield {
        items: [makeDoc("canvas-1"), makeDoc("canvas-2")],
        cursor: { lastCanvasSyncTimestamp: "300" } as SyncCursor,
        hasMore: false,
      };
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();

    const allBatches: FetchBatchOutput[] = [];
    let totalItems = 0;
    let totalDiscoveredResources = 0;

    for (let i = 0; i < 50; i += 1) {
      const result = await activity.fetchBatch({ connector, batchSize: 100 });
      allBatches.push(result);
      totalItems += result.items.length;
      totalDiscoveredResources += result.discoveredResources?.length ?? 0;
      if (!result.hasMore) {
        break;
      }
    }

    expect(allBatches).toHaveLength(7);

    expect(allBatches[0].items).toHaveLength(61);
    expect(allBatches[1].items).toHaveLength(29);
    expect(allBatches[2].items).toHaveLength(32);

    expect(allBatches[2].hasMore).toBe(true);

    expect(allBatches[3].items).toHaveLength(0);
    expect(allBatches[3].discoveredResources).toHaveLength(2);
    expect(allBatches[3].hasMore).toBe(true);

    expect(allBatches[4].items).toHaveLength(0);
    expect(allBatches[4].hasMore).toBe(true);

    expect(allBatches[5].items).toHaveLength(2);
    expect(allBatches[5].hasMore).toBe(true);

    expect(allBatches[6].items).toHaveLength(0);
    expect(allBatches[6].hasMore).toBe(false);

    expect(totalItems).toBe(61 + 29 + 32 + 2);
    expect(totalDiscoveredResources).toBe(2);
  });

  it("preserves generator after generator.next() throws (Temporal retry reuses same generator)", async () => {
    let callCount = 0;

    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      callCount += 1;
      yield { items: [makeDoc("batch-1")], hasMore: true };
      throw new Error("Slack API rate limit");
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();

    const batch1 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(batch1.items).toHaveLength(1);
    expect(batch1.items[0].id).toBe("batch-1");

    await expect(
      activity.fetchBatch({ connector, batchSize: 100 })
    ).rejects.toThrow("Slack API rate limit");

    expect(callCount).toBe(1);
  });

  it("REGRESSION: generator not cleaned up on error, so retry after transient failure works", async () => {
    let yieldCount = 0;

    registerSyncFactory("TEST_MULTI_STAGE", async function* () {
      await Promise.resolve();
      yieldCount += 1;
      yield { items: [makeDoc("a")], hasMore: true };
      yieldCount += 1;
      yield { items: [makeDoc("b")], hasMore: true };
      yieldCount += 1;
      yield { items: [makeDoc("c")], hasMore: false };
    });

    const activity = createUnifiedFetchBatchActivity({ db: {} as never });
    const connector = makeConnector();

    const r1 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(r1.items[0].id).toBe("a");
    expect(yieldCount).toBe(1);

    const r2 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(r2.items[0].id).toBe("b");
    expect(yieldCount).toBe(2);

    const r3 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(r3.items[0].id).toBe("c");
    expect(r3.hasMore).toBe(true);
    expect(yieldCount).toBe(3);

    const r4 = await activity.fetchBatch({ connector, batchSize: 100 });
    expect(r4.items).toHaveLength(0);
    expect(r4.hasMore).toBe(false);
  });
});
