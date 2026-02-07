import { describe, expect, it, mock } from "bun:test";
import {
  createActivityEvent,
  createDocumentChanges,
  createEntityChange,
  createUserInteraction,
  markChangesProcessed,
  upsertUserEntityAffinity,
} from "../knowledge-changes";

type MockCall = Record<string, unknown>;

describe("createDocumentChanges", () => {
  const createMockDb = () => ({
    documentChange: {
      createMany: mock((_args: MockCall) => Promise.resolve({ count: 3 })),
    },
  });

  it("inserts multiple changes in a single bulk operation", async () => {
    const mockDb = createMockDb();
    const result = await createDocumentChanges(
      mockDb as unknown as Parameters<typeof createDocumentChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        changes: [
          { documentId: "doc_1", changeType: "CREATED" as const },
          { documentId: "doc_2", changeType: "UPDATED" as const },
          { documentId: "doc_3", changeType: "DELETED" as const },
        ],
      }
    );

    expect(result.count).toBe(3);
    expect(mockDb.documentChange.createMany).toHaveBeenCalledTimes(1);

    const call = mockDb.documentChange.createMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>[];
    expect(data).toHaveLength(3);
    expect(data[0]?.teamId).toBe("team_1");
    expect(data[0]?.connectorId).toBe("conn_1");
    expect(data[0]?.documentId).toBe("doc_1");
    expect(data[0]?.changeType).toBe("CREATED");
  });

  it("defaults source to CONNECTOR_SYNC when not provided", async () => {
    const mockDb = createMockDb();
    await createDocumentChanges(
      mockDb as unknown as Parameters<typeof createDocumentChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        changes: [{ documentId: "doc_1", changeType: "CREATED" as const }],
      }
    );

    const call = mockDb.documentChange.createMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>[];
    expect(data[0]?.source).toBe("CONNECTOR_SYNC");
  });

  it("uses provided source when specified", async () => {
    const mockDb = createMockDb();
    await createDocumentChanges(
      mockDb as unknown as Parameters<typeof createDocumentChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        changes: [
          {
            documentId: "doc_1",
            changeType: "CREATED" as const,
            source: "USER_ACTION" as Parameters<
              typeof createDocumentChanges
            >[1]["changes"][0]["source"],
          },
        ],
      }
    );

    const call = mockDb.documentChange.createMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>[];
    expect(data[0]?.source).toBe("USER_ACTION");
  });

  it("defaults changedFields to empty array and metadata to empty object", async () => {
    const mockDb = createMockDb();
    await createDocumentChanges(
      mockDb as unknown as Parameters<typeof createDocumentChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        changes: [{ documentId: "doc_1", changeType: "UPDATED" as const }],
      }
    );

    const call = mockDb.documentChange.createMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>[];
    expect(data[0]?.changedFields).toEqual([]);
    expect(data[0]?.metadata).toEqual({});
  });

  it("passes optional fields when provided", async () => {
    const mockDb = createMockDb();
    const eventTime = new Date("2026-01-15");
    await createDocumentChanges(
      mockDb as unknown as Parameters<typeof createDocumentChanges>[0],
      {
        teamId: "team_1",
        connectorId: "conn_1",
        changes: [
          {
            documentId: "doc_1",
            changeType: "UPDATED" as const,
            changedBy: "user_1",
            changedFields: ["title", "body"],
            metadata: { version: 2 },
            eventTime,
          },
        ],
      }
    );

    const call = mockDb.documentChange.createMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>[];
    expect(data[0]?.changedBy).toBe("user_1");
    expect(data[0]?.changedFields).toEqual(["title", "body"]);
    expect(data[0]?.metadata).toEqual({ version: 2 });
    expect(data[0]?.eventTime).toEqual(eventTime);
  });
});

describe("createEntityChange", () => {
  const createMockDb = () => ({
    entityChange: {
      create: mock((_args: MockCall) => Promise.resolve({ id: "ec_123" })),
    },
  });

  it("creates an entity change record", async () => {
    const mockDb = createMockDb();
    const result = await createEntityChange(
      mockDb as unknown as Parameters<typeof createEntityChange>[0],
      {
        teamId: "team_1",
        entityId: "entity_1",
        field: "name",
        oldValue: "Alice",
        newValue: "Alice Smith",
        source: "CONNECTOR_SYNC" as const,
      }
    );

    expect(result.id).toBe("ec_123");
    expect(mockDb.entityChange.create).toHaveBeenCalledTimes(1);

    const call = mockDb.entityChange.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.teamId).toBe("team_1");
    expect(data.entityId).toBe("entity_1");
    expect(data.field).toBe("name");
    expect(data.oldValue).toBe("Alice");
    expect(data.newValue).toBe("Alice Smith");
  });

  it("handles optional triggeredBy field", async () => {
    const mockDb = createMockDb();
    await createEntityChange(
      mockDb as unknown as Parameters<typeof createEntityChange>[0],
      {
        teamId: "team_1",
        entityId: "entity_1",
        field: "score",
        source: "CONNECTOR_SYNC" as const,
        triggeredBy: "user_42",
      }
    );

    const call = mockDb.entityChange.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.triggeredBy).toBe("user_42");
  });
});

describe("createActivityEvent", () => {
  const createMockDb = () => ({
    activityEvent: {
      create: mock((_args: MockCall) => Promise.resolve({ id: "ae_123" })),
    },
  });

  it("creates an activity event", async () => {
    const mockDb = createMockDb();
    const result = await createActivityEvent(
      mockDb as unknown as Parameters<typeof createActivityEvent>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        action: "tool:search_hybrid",
        resourceType: "search",
        resourceId: "search_hybrid",
      }
    );

    expect(result.id).toBe("ae_123");
    expect(mockDb.activityEvent.create).toHaveBeenCalledTimes(1);

    const call = mockDb.activityEvent.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.teamId).toBe("team_1");
    expect(data.userId).toBe("user_1");
    expect(data.action).toBe("tool:search_hybrid");
    expect(data.resourceType).toBe("search");
    expect(data.resourceId).toBe("search_hybrid");
  });

  it("defaults metadata to empty object", async () => {
    const mockDb = createMockDb();
    await createActivityEvent(
      mockDb as unknown as Parameters<typeof createActivityEvent>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        action: "view",
        resourceType: "document",
        resourceId: "doc_1",
      }
    );

    const call = mockDb.activityEvent.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.metadata).toEqual({});
  });

  it("passes metadata when provided", async () => {
    const mockDb = createMockDb();
    await createActivityEvent(
      mockDb as unknown as Parameters<typeof createActivityEvent>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        action: "tool:doc_get",
        resourceType: "documents",
        resourceId: "doc_123",
        metadata: { durationMs: 45, cached: true },
      }
    );

    const call = mockDb.activityEvent.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.metadata).toEqual({ durationMs: 45, cached: true });
  });
});

describe("markChangesProcessed", () => {
  const createMockDb = () => ({
    documentChange: {
      updateMany: mock((_args: MockCall) => Promise.resolve({ count: 3 })),
    },
  });

  it("updates processedAt for all specified change IDs", async () => {
    const mockDb = createMockDb();
    const result = await markChangesProcessed(
      mockDb as unknown as Parameters<typeof markChangesProcessed>[0],
      ["change_1", "change_2", "change_3"]
    );

    expect(result.count).toBe(3);
    expect(mockDb.documentChange.updateMany).toHaveBeenCalledTimes(1);

    const call = mockDb.documentChange.updateMany.mock.calls[0];
    const where = call?.[0]?.where as Record<string, unknown>;
    expect((where.id as Record<string, unknown>)?.in).toEqual([
      "change_1",
      "change_2",
      "change_3",
    ]);
  });

  it("sets processedAt to a Date", async () => {
    const mockDb = createMockDb();
    await markChangesProcessed(
      mockDb as unknown as Parameters<typeof markChangesProcessed>[0],
      ["change_1"]
    );

    const call = mockDb.documentChange.updateMany.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.processedAt).toBeInstanceOf(Date);
  });
});

describe("createUserInteraction", () => {
  const createMockDb = () => ({
    userInteraction: {
      create: mock((_args: MockCall) => Promise.resolve({ id: "ui_123" })),
    },
  });

  it("creates a user interaction record", async () => {
    const mockDb = createMockDb();
    const result = await createUserInteraction(
      mockDb as unknown as Parameters<typeof createUserInteraction>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        documentId: "doc_1",
        action: "view",
      }
    );

    expect(result.id).toBe("ui_123");
    expect(mockDb.userInteraction.create).toHaveBeenCalledTimes(1);
  });

  it("defaults metadata to empty object", async () => {
    const mockDb = createMockDb();
    await createUserInteraction(
      mockDb as unknown as Parameters<typeof createUserInteraction>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        documentId: "doc_1",
        action: "bookmark",
      }
    );

    const call = mockDb.userInteraction.create.mock.calls[0];
    const data = call?.[0]?.data as Record<string, unknown>;
    expect(data.metadata).toEqual({});
  });
});

describe("upsertUserEntityAffinity", () => {
  const createMockDb = () => ({
    userEntityAffinity: {
      upsert: mock((_args: MockCall) =>
        Promise.resolve({
          teamId: "team_1",
          userId: "user_1",
          entityId: "entity_1",
          score: 1.5,
          source: "activity",
        })
      ),
    },
  });

  it("upserts with correct compound key", async () => {
    const mockDb = createMockDb();
    await upsertUserEntityAffinity(
      mockDb as unknown as Parameters<typeof upsertUserEntityAffinity>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        entityId: "entity_1",
        scoreDelta: 1.5,
        source: "activity",
      }
    );

    expect(mockDb.userEntityAffinity.upsert).toHaveBeenCalledTimes(1);

    const call = mockDb.userEntityAffinity.upsert.mock.calls[0];
    const args = call?.[0] as Record<string, unknown>;
    expect(
      (args.where as Record<string, unknown>).teamId_userId_entityId
    ).toEqual({
      teamId: "team_1",
      userId: "user_1",
      entityId: "entity_1",
    });
  });

  it("creates with scoreDelta as initial score on insert", async () => {
    const mockDb = createMockDb();
    await upsertUserEntityAffinity(
      mockDb as unknown as Parameters<typeof upsertUserEntityAffinity>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        entityId: "entity_1",
        scoreDelta: 2.0,
        source: "interaction",
      }
    );

    const call = mockDb.userEntityAffinity.upsert.mock.calls[0];
    const create = call?.[0]?.create as Record<string, unknown>;
    expect(create.score).toBe(2.0);
    expect(create.source).toBe("interaction");
  });

  it("increments score on update", async () => {
    const mockDb = createMockDb();
    await upsertUserEntityAffinity(
      mockDb as unknown as Parameters<typeof upsertUserEntityAffinity>[0],
      {
        teamId: "team_1",
        userId: "user_1",
        entityId: "entity_1",
        scoreDelta: 0.5,
        source: "search",
      }
    );

    const call = mockDb.userEntityAffinity.upsert.mock.calls[0];
    const update = call?.[0]?.update as Record<string, unknown>;
    expect(update.score).toEqual({ increment: 0.5 });
    expect(update.source).toBe("search");
  });
});
