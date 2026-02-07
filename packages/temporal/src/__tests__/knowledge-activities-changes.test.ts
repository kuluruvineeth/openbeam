import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCleanupKnowledgeChangesActivity } from "../activities/knowledge/cleanup";
import { createInvalidateEdgesActivity } from "../activities/knowledge/invalidate-edges";
import { createUpdateCoOccurrenceEdgesActivity } from "../activities/knowledge/update-co-occurrence-edges";

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
      info: { activityId: "test-activity", attempt: 1 },
    }),
  },
}));

vi.mock("@openplane/db", () => ({
  fetchUnprocessedChanges: vi.fn(),
  countUnprocessedChanges: vi.fn(),
  markChangesProcessed: vi.fn(),
  createEntityChange: vi.fn(),
}));

interface MockDb {
  $queryRaw: ReturnType<typeof vi.fn>;
  documentChange: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  entityMention: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  entityRelation: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  entity: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  entityChange: {
    create: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  activityEvent: { deleteMany: ReturnType<typeof vi.fn> };
  indexedDocument: { findFirst: ReturnType<typeof vi.fn> };
}

function createMockDb(): MockDb {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ co_count: BigInt(2) }]),
    documentChange: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    entityMention: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    entityRelation: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    entity: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-entity" }),
      update: vi.fn().mockResolvedValue({}),
    },
    entityChange: {
      create: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    activityEvent: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    indexedDocument: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
}

interface MockVespa {
  getDocument: ReturnType<typeof vi.fn>;
}

function createMockVespa(): MockVespa {
  return {
    getDocument: vi.fn().mockResolvedValue(null),
  };
}

describe("fetchUnprocessedChanges activity", () => {
  it("delegates to scoped db query with connector/sync filters", async () => {
    const { fetchUnprocessedChanges } = await import("@openplane/db");
    const mockFetch = vi.mocked(fetchUnprocessedChanges);
    const db = createMockDb();

    const changes = [
      { id: "c1", teamId: "team1", documentId: "doc1", changeType: "CREATED" },
    ];
    mockFetch.mockResolvedValue(
      changes as unknown as Awaited<ReturnType<typeof fetchUnprocessedChanges>>
    );

    const { createFetchUnprocessedChangesActivity } = await import(
      "../activities/knowledge/fetch-unprocessed-changes"
    );
    const activity = createFetchUnprocessedChangesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-1",
    });

    expect(result).toEqual(changes);
    expect(mockFetch).toHaveBeenCalledWith(
      db,
      {
        teamId: "team1",
        connectorId: "conn-1",
        syncHistoryId: "sync-1",
      },
      { limit: 1000 }
    );
  });

  it("respects custom limit parameter", async () => {
    const { fetchUnprocessedChanges } = await import("@openplane/db");
    const mockFetch = vi.mocked(fetchUnprocessedChanges);
    const db = createMockDb();
    mockFetch.mockResolvedValue([]);

    const { createFetchUnprocessedChangesActivity } = await import(
      "../activities/knowledge/fetch-unprocessed-changes"
    );
    const activity = createFetchUnprocessedChangesActivity({ db: db as never });
    await activity({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-1",
      limit: 50,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      db,
      {
        teamId: "team1",
        connectorId: "conn-1",
        syncHistoryId: "sync-1",
      },
      { limit: 50 }
    );
  });
});

describe("countUnprocessedChanges activity", () => {
  it("delegates to scoped db count query", async () => {
    const { countUnprocessedChanges } = await import("@openplane/db");
    const mockCount = vi.mocked(countUnprocessedChanges);
    mockCount.mockResolvedValue(42);
    const db = createMockDb();

    const { createCountUnprocessedChangesActivity } = await import(
      "../activities/knowledge/count-unprocessed-changes"
    );
    const activity = createCountUnprocessedChangesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-1",
    });

    expect(result).toBe(42);
    expect(mockCount).toHaveBeenCalledWith(db, {
      teamId: "team1",
      connectorId: "conn-1",
      syncHistoryId: "sync-1",
    });
  });
});

describe("markChangesProcessed activity", () => {
  it("delegates to db mutation with change IDs", async () => {
    const { markChangesProcessed } = await import("@openplane/db");
    const mockMark = vi.mocked(markChangesProcessed);
    mockMark.mockResolvedValue(undefined);
    const db = createMockDb();

    const { createMarkChangesProcessedActivity } = await import(
      "../activities/knowledge/mark-changes-processed"
    );
    const activity = createMarkChangesProcessedActivity({ db: db as never });
    await activity({ changeIds: ["c1", "c2"] });

    expect(mockMark).toHaveBeenCalledWith(db, ["c1", "c2"]);
  });
});

describe("invalidateEdges activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when no mentions exist for document", async () => {
    const db = createMockDb();
    db.entityMention.findMany.mockResolvedValue([]);

    const activity = createInvalidateEdgesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      documentId: "doc-deleted",
    });

    expect(result).toEqual({ edgesInvalidated: 0, mentionsRemoved: 0 });
    expect(db.entityMention.deleteMany).not.toHaveBeenCalled();
  });

  it("sets confidence to 0 on edges and deletes mentions exactly once", async () => {
    const db = createMockDb();
    const { createEntityChange } = await import("@openplane/db");

    db.entityMention.findMany.mockResolvedValue([{ id: "m1", entityId: "e1" }]);
    db.entityMention.count.mockResolvedValue(0);
    db.entityRelation.findMany.mockResolvedValue([
      { id: "r1", fromEntityId: "e1", toEntityId: "e2", confidence: 0.8 },
      { id: "r2", fromEntityId: "e3", toEntityId: "e1", confidence: 0.5 },
    ]);

    const activity = createInvalidateEdgesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      documentId: "doc-deleted",
    });

    expect(result).toEqual({ edgesInvalidated: 2, mentionsRemoved: 1 });
    expect(db.entityRelation.update).toHaveBeenCalledTimes(2);
    expect(db.entityMention.deleteMany).toHaveBeenCalledWith({
      where: { documentId: "doc-deleted" },
    });
    expect(createEntityChange).toHaveBeenCalledTimes(2);
  });
});

describe("updateCoOccurrenceEdges activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes relationType and deterministic weight from support count", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([{ co_count: BigInt(4) }]);

    const mentions = [
      {
        entityId: "e1",
        entityName: "Alice",
        entityType: "PERSON",
        documentId: "doc1",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Bob",
        entityType: "PERSON",
        documentId: "doc1",
        confidence: 0.8,
      },
      {
        entityId: "e1",
        entityName: "Alice",
        entityType: "PERSON",
        documentId: "doc2",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Bob",
        entityType: "PERSON",
        documentId: "doc2",
        confidence: 0.8,
      },
    ];

    const activity = createUpdateCoOccurrenceEdgesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      entityMentions: mentions,
    });

    expect(result).toEqual({ edgesCreated: 1, edgesUpdated: 0 });
    expect(db.entityRelation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        relationType: "COLLABORATES_WITH",
        weight: 4,
        confidence: 0.4,
      }),
    });
  });

  it("uses RELATES_TO for unmapped entity type pairs", async () => {
    const db = createMockDb();
    db.$queryRaw.mockResolvedValue([{ co_count: BigInt(2) }]);

    const mentions = [
      {
        entityId: "e1",
        entityName: "NYC",
        entityType: "LOCATION",
        documentId: "doc1",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Launch",
        entityType: "EVENT",
        documentId: "doc1",
        confidence: 0.8,
      },
      {
        entityId: "e1",
        entityName: "NYC",
        entityType: "LOCATION",
        documentId: "doc2",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Launch",
        entityType: "EVENT",
        documentId: "doc2",
        confidence: 0.8,
      },
    ];

    const activity = createUpdateCoOccurrenceEdgesActivity({ db: db as never });
    await activity({ teamId: "team1", entityMentions: mentions });

    expect(db.entityRelation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        relationType: "RELATES_TO",
      }),
    });
  });

  it("updates existing edge with deterministic weight instead of increment", async () => {
    const db = createMockDb();
    const { createEntityChange } = await import("@openplane/db");
    db.$queryRaw.mockResolvedValue([{ co_count: BigInt(7) }]);

    db.entityRelation.findFirst.mockResolvedValue({
      id: "existing-r1",
      fromEntityId: "e1",
      toEntityId: "e2",
      relationType: "COLLABORATES_WITH",
      weight: 3,
      confidence: 0.3,
    });

    const mentions = [
      {
        entityId: "e1",
        entityName: "Alice",
        entityType: "PERSON",
        documentId: "doc1",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Bob",
        entityType: "PERSON",
        documentId: "doc1",
        confidence: 0.8,
      },
      {
        entityId: "e1",
        entityName: "Alice",
        entityType: "PERSON",
        documentId: "doc2",
        confidence: 0.9,
      },
      {
        entityId: "e2",
        entityName: "Bob",
        entityType: "PERSON",
        documentId: "doc2",
        confidence: 0.8,
      },
    ];

    const activity = createUpdateCoOccurrenceEdgesActivity({ db: db as never });
    const result = await activity({
      teamId: "team1",
      entityMentions: mentions,
    });

    expect(result).toEqual({ edgesCreated: 0, edgesUpdated: 1 });
    expect(db.entityRelation.update).toHaveBeenCalledWith({
      where: { id: "existing-r1" },
      data: {
        weight: 7,
        confidence: 0.7,
      },
    });
    expect(createEntityChange).toHaveBeenCalledTimes(1);
  });
});

describe("extractEntitiesFromChanges activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("resolves docs via vespaId, fetches content from vespa, and writes schema-correct mentions", async () => {
    const db = createMockDb();
    const vespa = createMockVespa();

    db.indexedDocument.findFirst.mockResolvedValue({
      title: "Alice joins Project Alpha",
    });
    vespa.getDocument.mockResolvedValue({
      id: "doc1",
      title: "Alice joins Project Alpha",
      content: "Alice joined OpenPlane to work on search ranking.",
    });

    db.entity.findFirst.mockResolvedValue(null);
    db.entity.create.mockResolvedValue({ id: "new-e1" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          entities: [{ text: "Alice", type: "person", confidence: 0.95 }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { createExtractEntitiesFromChangesActivity } = await import(
      "../activities/knowledge/extract-entities-from-changes"
    );

    const activity = createExtractEntitiesFromChangesActivity({
      db: db as never,
      vespa: vespa as never,
      engineBaseUrl: "http://engine:8000",
    });

    const result = await activity({ teamId: "team1", documentIds: ["doc1"] });

    expect(db.indexedDocument.findFirst).toHaveBeenCalledWith({
      where: { vespaId: "doc1" },
      select: { title: true },
    });
    expect(vespa.getDocument).toHaveBeenCalledWith("doc1");
    expect(result.entitiesUpdated).toBe(1);
    expect(result.mentions[0]).toEqual(
      expect.objectContaining({
        entityId: "new-e1",
        entityName: "Alice",
        entityType: "PERSON",
        documentId: "doc1",
      })
    );

    expect(mockFetch).toHaveBeenCalledWith(
      "http://engine:8000/v1/entities/extract/document",
      expect.objectContaining({
        method: "POST",
      })
    );

    const fetchBody = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string);
    expect(fetchBody).toMatchObject({
      doc_id: "doc1",
      title: "Alice joins Project Alpha",
    });
    expect(String(fetchBody.content)).toContain("OpenPlane");

    expect(db.entityMention.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          entityId: "new-e1",
          documentId: "doc1",
          teamId: "team1",
          mentionText: "Alice",
          source: "INFERENCE_PIPELINE",
          confidence: 0.95,
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("maps unknown entity labels to TOPIC", async () => {
    const db = createMockDb();
    const vespa = createMockVespa();

    vespa.getDocument.mockResolvedValue({
      id: "doc2",
      title: "Ship launch notes",
      content: "Launch event kickoff tomorrow",
    });

    db.entity.findFirst.mockResolvedValue(null);
    db.entity.create.mockResolvedValue({ id: "new-topic" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            entities: [
              { text: "Kickoff", type: "unknown_label", confidence: 0.7 },
            ],
          }),
      })
    );

    const { createExtractEntitiesFromChangesActivity } = await import(
      "../activities/knowledge/extract-entities-from-changes"
    );

    const activity = createExtractEntitiesFromChangesActivity({
      db: db as never,
      vespa: vespa as never,
      engineBaseUrl: "http://engine:8000",
    });

    const result = await activity({ teamId: "team1", documentIds: ["doc2"] });

    expect(result.mentions[0]?.entityType).toBe("TOPIC");
    expect(db.entity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "TOPIC",
      }),
    });
  });
});

describe("cleanupKnowledgeChanges activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes old records using default retention days", async () => {
    const db = createMockDb();
    db.documentChange.deleteMany.mockResolvedValue({ count: 10 });
    db.entityChange.deleteMany.mockResolvedValue({ count: 5 });
    db.activityEvent.deleteMany.mockResolvedValue({ count: 20 });

    const activity = createCleanupKnowledgeChangesActivity({ db: db as never });
    const result = await activity({});

    expect(result).toEqual({
      documentChangesDeleted: 10,
      entityChangesDeleted: 5,
      activityEventsDeleted: 20,
    });
  });

  it("respects custom retention windows", async () => {
    const db = createMockDb();
    db.documentChange.deleteMany.mockResolvedValue({ count: 0 });
    db.entityChange.deleteMany.mockResolvedValue({ count: 0 });
    db.activityEvent.deleteMany.mockResolvedValue({ count: 0 });

    const activity = createCleanupKnowledgeChangesActivity({ db: db as never });
    await activity({
      documentChangeRetentionDays: 30,
      entityChangeRetentionDays: 60,
      activityEventRetentionDays: 7,
    });

    const docCutoff =
      db.documentChange.deleteMany.mock.calls[0]?.[0]?.where?.createdAt?.lt;
    const entityCutoff =
      db.entityChange.deleteMany.mock.calls[0]?.[0]?.where?.createdAt?.lt;
    const activityCutoff =
      db.activityEvent.deleteMany.mock.calls[0]?.[0]?.where?.createdAt?.lt;

    expect(docCutoff.getTime()).toBeGreaterThan(entityCutoff.getTime());
    expect(activityCutoff.getTime()).toBeGreaterThan(docCutoff.getTime());
  });
});
