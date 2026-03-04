import { describe, expect, it } from "bun:test";
import {
  type OutboundEvent,
  OutboundEventPrioritySchema,
  OutboundEventSchema,
  OutboundEventStatusSchema,
  type QueueStats,
  QueueStatsSchema,
} from "../queue";

const NOW = Date.now();

describe("OutboundEventPrioritySchema", () => {
  it("accepts valid priorities", () => {
    for (const p of ["critical", "high", "normal", "low"]) {
      expect(OutboundEventPrioritySchema.parse(p)).toBe(p);
    }
  });
});

describe("OutboundEventStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const s of ["queued", "sending", "sent", "failed", "expired"]) {
      expect(OutboundEventStatusSchema.parse(s)).toBe(s);
    }
  });
});

describe("OutboundEventSchema", () => {
  it("parses valid event with defaults", () => {
    const event: OutboundEvent = OutboundEventSchema.parse({
      id: "out-1",
      type: "sync_batch",
      payload: { documents: [{ id: "doc-1" }] },
      sizeBytes: 2048,
      createdAt: NOW,
    });
    expect(event.priority).toBe("normal");
    expect(event.status).toBe("queued");
    expect(event.attempts).toBe(0);
    expect(event.maxAttempts).toBe(5);
  });

  it("parses fully populated event", () => {
    const event = OutboundEventSchema.parse({
      id: "out-2",
      type: "health_report",
      payload: { nodeId: "edge-1" },
      priority: "high",
      status: "sending",
      attempts: 2,
      maxAttempts: 10,
      sizeBytes: 512,
      createdAt: NOW - 30_000,
      scheduledAt: NOW,
      expiresAt: NOW + 3_600_000,
      lastError: "Connection timeout",
    });
    expect(event.priority).toBe("high");
    expect(event.attempts).toBe(2);
    expect(event.lastError).toBe("Connection timeout");
  });

  it("rejects empty type", () => {
    expect(() =>
      OutboundEventSchema.parse({
        id: "out-3",
        type: "",
        payload: {},
        sizeBytes: 0,
        createdAt: NOW,
      })
    ).toThrow();
  });

  it("rejects negative sizeBytes", () => {
    expect(() =>
      OutboundEventSchema.parse({
        id: "out-4",
        type: "test",
        payload: {},
        sizeBytes: -1,
        createdAt: NOW,
      })
    ).toThrow();
  });
});

describe("QueueStatsSchema", () => {
  it("parses valid stats", () => {
    const stats: QueueStats = QueueStatsSchema.parse({
      totalEvents: 100,
      pendingEvents: 20,
      failedEvents: 3,
      totalSizeBytes: 1_048_576,
      maxSizeBytes: 104_857_600,
    });
    expect(stats.totalEvents).toBe(100);
    expect(stats.oldestEventAt).toBeUndefined();
  });

  it("accepts oldest event timestamp", () => {
    const stats = QueueStatsSchema.parse({
      totalEvents: 50,
      pendingEvents: 10,
      failedEvents: 0,
      totalSizeBytes: 524_288,
      maxSizeBytes: 104_857_600,
      oldestEventAt: NOW - 86_400_000,
    });
    expect(stats.oldestEventAt).toBeDefined();
  });
});
