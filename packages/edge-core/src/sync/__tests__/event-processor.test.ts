import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SyncEvent } from "@openplane/types/edge/sync";
import { SyncEventProcessor } from "../event-processor";

function createSyncEvent(overrides: Partial<SyncEvent> = {}): SyncEvent {
  return {
    id: crypto.randomUUID(),
    type: "upsert",
    documentId: `doc-${crypto.randomUUID().slice(0, 8)}`,
    connectorId: "connector-1",
    timestamp: Date.now(),
    ...overrides,
  };
}

function first<T>(arr: T[]): T {
  const item = arr[0];
  if (item === undefined) {
    throw new Error("Expected non-empty array");
  }
  return item;
}

describe("SyncEventProcessor", () => {
  let db: Database;
  let processor: SyncEventProcessor;

  beforeEach(() => {
    db = new Database(":memory:");
    processor = new SyncEventProcessor(db);
  });

  afterEach(() => {
    db.close();
  });

  test("processBatch upserts events into SQLite", () => {
    const event = createSyncEvent({
      payload: { title: "Test doc" },
      checksum: "abc123",
      sizeBytes: 256,
    });

    const result = processor.processBatch([event]);

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);

    const stored = processor.getEventsByConnector("connector-1");
    expect(stored.length).toBe(1);
    expect(first(stored).id).toBe(event.id);
    expect(first(stored).checksum).toBe("abc123");
  });

  test("processBatch handles delete events by removing matching documents", () => {
    const upsertEvent = createSyncEvent({
      documentId: "doc-to-delete",
      type: "upsert",
    });
    processor.processBatch([upsertEvent]);

    const deleteEvent = createSyncEvent({
      documentId: "doc-to-delete",
      type: "delete",
    });
    const result = processor.processBatch([deleteEvent]);

    expect(result.processed).toBe(1);
    const stored = processor.getEventsByConnector("connector-1");
    expect(stored.length).toBe(0);
  });

  test("processBatch handles permission_change events", () => {
    const event = createSyncEvent({
      type: "permission_change",
      payload: { acl: ["user-1", "user-2"] },
    });

    const result = processor.processBatch([event]);

    expect(result.processed).toBe(1);
    const stored = processor.getEventsByConnector("connector-1");
    expect(stored.length).toBe(1);
    expect(first(stored).type).toBe("permission_change");
  });

  test("processBatch with empty batch returns zero counts", () => {
    const result = processor.processBatch([]);

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
  });

  test("processBatch handles duplicate ids via upsert", () => {
    const id = crypto.randomUUID();
    const firstEvent = createSyncEvent({
      id,
      payload: { version: 1 },
      timestamp: 1000,
    });
    const second = createSyncEvent({
      id,
      payload: { version: 2 },
      timestamp: 2000,
    });

    processor.processBatch([firstEvent]);
    processor.processBatch([second]);

    const stored = processor.getEventsByConnector("connector-1");
    expect(stored.length).toBe(1);
    expect(first(stored).timestamp).toBe(2000);
  });

  test("processBatch processes multiple event types in one batch", () => {
    const events: SyncEvent[] = [
      createSyncEvent({ type: "upsert", documentId: "doc-1" }),
      createSyncEvent({ type: "permission_change", documentId: "doc-2" }),
      createSyncEvent({ type: "upsert", documentId: "doc-3" }),
    ];

    const result = processor.processBatch(events);

    expect(result.processed).toBe(3);
    expect(result.errors).toEqual([]);
  });

  test("processBatch preserves payload as JSON", () => {
    const event = createSyncEvent({
      payload: { nested: { key: "value" }, count: 42 },
    });

    processor.processBatch([event]);

    const stored = processor.getEventsByConnector("connector-1");
    const payload = first(stored).payload as Record<string, unknown>;
    expect(payload.count).toBe(42);
    const nested = payload.nested as Record<string, unknown>;
    expect(nested.key).toBe("value");
  });

  test("processBatch stores events with undefined payload", () => {
    const event = createSyncEvent({ payload: undefined });

    processor.processBatch([event]);

    const stored = processor.getEventsByConnector("connector-1");
    expect(first(stored).payload).toBeUndefined();
  });

  test("getEventsByConnector filters by connector id", () => {
    processor.processBatch([
      createSyncEvent({ connectorId: "conn-a" }),
      createSyncEvent({ connectorId: "conn-b" }),
      createSyncEvent({ connectorId: "conn-a" }),
    ]);

    const connA = processor.getEventsByConnector("conn-a");
    expect(connA.length).toBe(2);
    for (const event of connA) {
      expect(event.connectorId).toBe("conn-a");
    }
  });

  test("getEventsByConnector respects limit parameter", () => {
    processor.processBatch([
      createSyncEvent({ connectorId: "conn-1" }),
      createSyncEvent({ connectorId: "conn-1" }),
      createSyncEvent({ connectorId: "conn-1" }),
    ]);

    const events = processor.getEventsByConnector("conn-1", 2);
    expect(events.length).toBe(2);
  });

  test("getEventsByConnector returns empty for unknown connector", () => {
    const events = processor.getEventsByConnector("nonexistent");
    expect(events).toEqual([]);
  });

  test("getEventsSince filters by timestamp", () => {
    const baseTime = 1_000_000;
    processor.processBatch([
      createSyncEvent({ timestamp: baseTime - 100 }),
      createSyncEvent({ timestamp: baseTime }),
      createSyncEvent({ timestamp: baseTime + 100 }),
    ]);

    const events = processor.getEventsSince(baseTime);
    expect(events.length).toBe(2);
  });

  test("getEventsSince respects limit", () => {
    const baseTime = 1_000_000;
    processor.processBatch([
      createSyncEvent({ timestamp: baseTime }),
      createSyncEvent({ timestamp: baseTime + 1 }),
      createSyncEvent({ timestamp: baseTime + 2 }),
    ]);

    const events = processor.getEventsSince(baseTime, 2);
    expect(events.length).toBe(2);
  });

  test("getEventsSince returns events in ascending timestamp order", () => {
    const baseTime = 1_000_000;
    processor.processBatch([
      createSyncEvent({ timestamp: baseTime + 200 }),
      createSyncEvent({ timestamp: baseTime }),
      createSyncEvent({ timestamp: baseTime + 100 }),
    ]);

    const events = processor.getEventsSince(baseTime);
    expect(events.length).toBe(3);
    const [e0, e1, e2] = events as [SyncEvent, SyncEvent, SyncEvent];
    expect(e0.timestamp).toBe(baseTime);
    expect(e1.timestamp).toBe(baseTime + 100);
    expect(e2.timestamp).toBe(baseTime + 200);
  });

  test("deleteProcessedEvents removes old processed events", () => {
    const event1 = createSyncEvent();
    const event2 = createSyncEvent();
    processor.processBatch([event1, event2]);

    const oldProcessedAt = Date.now() - 120_000;
    db.query("UPDATE sync_events SET processed_at = ? WHERE id = ?").run(
      oldProcessedAt,
      event1.id
    );

    const deleted = processor.deleteProcessedEvents(Date.now() - 60_000);
    expect(deleted).toBe(1);

    const remaining = processor.getEventsByConnector("connector-1");
    expect(remaining.length).toBe(1);
    expect(first(remaining).id).toBe(event2.id);
  });

  test("deleteProcessedEvents returns 0 when nothing qualifies", () => {
    processor.processBatch([createSyncEvent()]);

    const deleted = processor.deleteProcessedEvents(0);
    expect(deleted).toBe(0);
  });
});
