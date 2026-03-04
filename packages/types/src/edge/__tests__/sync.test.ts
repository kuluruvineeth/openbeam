import { describe, expect, it } from "bun:test";
import {
  BANDWIDTH_THRESHOLDS,
  BandwidthPolicySchema,
  type EdgeSyncCursor,
  EdgeSyncCursorSchema,
  type SyncEvent,
  SyncEventSchema,
  SyncEventTypeSchema,
} from "../sync";

describe("SyncEventTypeSchema", () => {
  it("accepts valid types", () => {
    for (const t of ["upsert", "delete", "permission_change"]) {
      expect(SyncEventTypeSchema.parse(t)).toBe(t);
    }
  });

  it("rejects invalid type", () => {
    expect(() => SyncEventTypeSchema.parse("move")).toThrow();
  });
});

describe("SyncEventSchema", () => {
  it("parses valid event", () => {
    const event: SyncEvent = SyncEventSchema.parse({
      id: "evt-1",
      type: "upsert",
      documentId: "doc-123",
      connectorId: "conn-1",
      timestamp: Date.now(),
    });
    expect(event.id).toBe("evt-1");
    expect(event.payload).toBeUndefined();
  });

  it("accepts optional fields", () => {
    const event = SyncEventSchema.parse({
      id: "evt-2",
      type: "delete",
      documentId: "doc-456",
      connectorId: "conn-2",
      timestamp: Date.now(),
      checksum: "abc123",
      sizeBytes: 1024,
      payload: { reason: "user_deleted" },
    });
    expect(event.checksum).toBe("abc123");
    expect(event.sizeBytes).toBe(1024);
  });

  it("rejects missing required fields", () => {
    expect(() => SyncEventSchema.parse({ id: "evt-3" })).toThrow();
  });
});

describe("EdgeSyncCursorSchema", () => {
  it("parses with defaults", () => {
    const cursor: EdgeSyncCursor = EdgeSyncCursorSchema.parse({
      connectorId: "conn-1",
    });
    expect(cursor.fullSyncCompleted).toBe(false);
    expect(cursor.version).toBe(0);
    expect(cursor.lastEventId).toBeUndefined();
  });

  it("parses fully populated cursor", () => {
    const cursor = EdgeSyncCursorSchema.parse({
      connectorId: "conn-1",
      lastEventId: "evt-100",
      lastTimestamp: Date.now(),
      merkleRoot: "deadbeef",
      fullSyncCompleted: true,
      version: 5,
    });
    expect(cursor.merkleRoot).toBe("deadbeef");
    expect(cursor.version).toBe(5);
  });
});

describe("BandwidthPolicySchema", () => {
  it("parses valid policy", () => {
    const policy = BandwidthPolicySchema.parse({
      estimatedKbps: 5000,
      syncMode: "incremental",
      maxBatchSizeKb: 512,
      compressionEnabled: true,
    });
    expect(policy.syncMode).toBe("incremental");
    expect(policy.compressionEnabled).toBe(true);
  });

  it("rejects negative bandwidth", () => {
    expect(() =>
      BandwidthPolicySchema.parse({
        estimatedKbps: -1,
        syncMode: "full",
        maxBatchSizeKb: 100,
        compressionEnabled: false,
      })
    ).toThrow();
  });
});

describe("BANDWIDTH_THRESHOLDS", () => {
  it("has descending thresholds", () => {
    expect(BANDWIDTH_THRESHOLDS.full).toBeGreaterThan(
      BANDWIDTH_THRESHOLDS.incremental
    );
    expect(BANDWIDTH_THRESHOLDS.incremental).toBeGreaterThan(
      BANDWIDTH_THRESHOLDS.metadata_only
    );
    expect(BANDWIDTH_THRESHOLDS.metadata_only).toBeGreaterThan(
      BANDWIDTH_THRESHOLDS.manual
    );
  });
});
