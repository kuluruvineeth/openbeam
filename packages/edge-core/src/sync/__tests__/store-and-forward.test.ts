import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OutboundEvent } from "@openplane/types/edge/queue";
import { StoreAndForwardQueue } from "../store-and-forward";

function first<T>(arr: T[]): T {
  const item = arr[0];
  if (item === undefined) {
    throw new Error("Expected non-empty array");
  }
  return item;
}

describe("StoreAndForwardQueue", () => {
  let db: Database;
  let queue: StoreAndForwardQueue;

  beforeEach(() => {
    db = new Database(":memory:");
    queue = new StoreAndForwardQueue(db, 1);
  });

  afterEach(() => {
    db.close();
  });

  test("enqueue and dequeue round-trip", () => {
    const id = queue.enqueue("sync_update", { data: "test" });

    const events = queue.dequeue(10);
    expect(events.length).toBe(1);
    const event = first(events);
    expect(event.id).toBe(id);
    expect(event.type).toBe("sync_update");
    expect(event.payload).toEqual({ data: "test" });
    expect(event.status).toBe("queued");
  });

  test("dequeue respects priority order with critical first", () => {
    queue.enqueue("low-task", { n: 1 }, "low");
    queue.enqueue("critical-task", { n: 2 }, "critical");
    queue.enqueue("normal-task", { n: 3 }, "normal");
    queue.enqueue("high-task", { n: 4 }, "high");

    const events = queue.dequeue(10);
    expect(events.length).toBe(4);
    const [e0, e1, e2, e3] = events as [
      OutboundEvent,
      OutboundEvent,
      OutboundEvent,
      OutboundEvent,
    ];
    expect(e0.type).toBe("critical-task");
    expect(e1.type).toBe("high-task");
    expect(e2.type).toBe("normal-task");
    expect(e3.type).toBe("low-task");
  });

  test("dequeue returns empty when queue is empty", () => {
    expect(queue.dequeue()).toEqual([]);
  });

  test("markSent updates status and excludes from dequeue", () => {
    const id = queue.enqueue("task", { data: 1 });
    queue.markSent(id);

    const events = queue.dequeue(10);
    expect(events.length).toBe(0);
  });

  test("markFailed increments attempts and records error", () => {
    const id = queue.enqueue("task", { data: 1 });
    queue.markFailed(id, "network error");

    const stats = queue.getStats();
    expect(stats.pendingEvents).toBe(1);

    const events = queue.dequeue(10);
    expect(events.length).toBe(1);
    expect(first(events).attempts).toBe(1);
  });

  test("markFailed moves to failed status after max attempts", () => {
    const id = queue.enqueue("task", { data: 1 });

    for (let i = 0; i < 5; i += 1) {
      queue.markFailed(id, `error ${i}`);
    }

    const stats = queue.getStats();
    expect(stats.failedEvents).toBe(1);
    expect(stats.pendingEvents).toBe(0);

    const events = queue.dequeue(10);
    expect(events.length).toBe(0);
  });

  test("getStats returns accurate counts", () => {
    queue.enqueue("task-1", { data: 1 });
    queue.enqueue("task-2", { data: 2 });

    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.pendingEvents).toBe(2);
    expect(stats.failedEvents).toBe(0);
    expect(stats.totalSizeBytes).toBeGreaterThan(0);
    expect(stats.maxSizeBytes).toBe(1 * 1024 * 1024);
  });

  test("getStats tracks oldest pending event", () => {
    const before = Date.now();
    queue.enqueue("first", { n: 1 });
    queue.enqueue("second", { n: 2 });

    const stats = queue.getStats();
    expect(stats.oldestEventAt).toBeDefined();
    expect(stats.oldestEventAt).toBeGreaterThanOrEqual(before);
  });

  test("getStats returns undefined oldestEventAt when empty", () => {
    const stats = queue.getStats();
    expect(stats.oldestEventAt).toBeUndefined();
  });

  test("evict removes expired events", () => {
    queue.enqueue("task", { data: 1 });

    db.query("UPDATE outbound_queue SET expires_at = ? WHERE 1=1").run(
      Date.now() - 10_000
    );

    const evicted = queue.evict();
    expect(evicted).toBe(1);

    const events = queue.dequeue(10);
    expect(events.length).toBe(0);
  });

  test("evict returns 0 when nothing expired", () => {
    queue.enqueue("task", { data: 1 });
    expect(queue.evict()).toBe(0);
  });

  test("evict removes lowest priority events when over size cap", () => {
    const tinyQueue = new StoreAndForwardQueue(db, 0);

    db.exec("DELETE FROM outbound_queue");

    const bigPayload = { data: "x".repeat(500) };
    db.query(
      `INSERT INTO outbound_queue (id, type, payload, priority, status, attempts, max_attempts, size_bytes, created_at)
       VALUES (?, ?, ?, ?, 'queued', 0, 5, ?, ?)`
    ).run(
      "critical-1",
      "critical-task",
      JSON.stringify(bigPayload),
      0,
      1000,
      Date.now()
    );

    db.query(
      `INSERT INTO outbound_queue (id, type, payload, priority, status, attempts, max_attempts, size_bytes, created_at)
       VALUES (?, ?, ?, ?, 'queued', 0, 5, ?, ?)`
    ).run("low-1", "low-task", JSON.stringify(bigPayload), 3, 1000, Date.now());

    const evicted = tinyQueue.evict();
    expect(evicted).toBeGreaterThan(0);
  });

  test("clear empties the queue", () => {
    queue.enqueue("task-1", { data: 1 });
    queue.enqueue("task-2", { data: 2 });

    queue.clear();

    const events = queue.dequeue(10);
    expect(events.length).toBe(0);

    const stats = queue.getStats();
    expect(stats.totalEvents).toBe(0);
  });

  test("dequeue with limit parameter", () => {
    queue.enqueue("task-1", { data: 1 });
    queue.enqueue("task-2", { data: 2 });
    queue.enqueue("task-3", { data: 3 });

    const events = queue.dequeue(2);
    expect(events.length).toBe(2);
  });

  test("enqueue returns unique event id", () => {
    const id1 = queue.enqueue("task", { n: 1 });
    const id2 = queue.enqueue("task", { n: 2 });
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });

  test("dequeue only returns queued events, not sent or failed", () => {
    const sent = queue.enqueue("sent-task", { n: 1 });
    queue.enqueue("queued-task", { n: 2 });
    const failed = queue.enqueue("failed-task", { n: 3 });

    queue.markSent(sent);
    for (let i = 0; i < 5; i += 1) {
      queue.markFailed(failed, "err");
    }

    const events = queue.dequeue(10);
    expect(events.length).toBe(1);
    expect(first(events).type).toBe("queued-task");
  });

  test("markFailed keeps event queued before max attempts", () => {
    const id = queue.enqueue("task", { data: 1 });
    queue.markFailed(id, "first error");

    const events = queue.dequeue(10);
    expect(events.length).toBe(1);
    expect(first(events).lastError).toBe("first error");
  });

  test("default priority is normal", () => {
    queue.enqueue("task", { data: 1 });
    const events = queue.dequeue(1);
    expect(first(events).priority).toBe("normal");
  });
});
