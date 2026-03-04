import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { CursorManager } from "../cursor-manager";

describe("CursorManager", () => {
  let db: Database;
  let manager: CursorManager;

  beforeEach(() => {
    db = new Database(":memory:");
    manager = new CursorManager(db);
  });

  afterEach(() => {
    db.close();
  });

  test("getCursor returns null for unknown connector", () => {
    expect(manager.getCursor("missing")).toBeNull();
  });

  test("saveCursor and getCursor round-trip", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      lastEventId: "evt-100",
      lastTimestamp: 1000,
      merkleRoot: "abc123",
      fullSyncCompleted: true,
      version: 5,
    });

    const cursor = manager.getCursor("conn-1");
    expect(cursor).not.toBeNull();
    expect(cursor?.connectorId).toBe("conn-1");
    expect(cursor?.lastEventId).toBe("evt-100");
    expect(cursor?.lastTimestamp).toBe(1000);
    expect(cursor?.merkleRoot).toBe("abc123");
    expect(cursor?.fullSyncCompleted).toBe(true);
    expect(cursor?.version).toBe(5);
  });

  test("saveCursor overwrites existing cursor", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      lastEventId: "evt-1",
      fullSyncCompleted: false,
      version: 1,
    });

    manager.saveCursor({
      connectorId: "conn-1",
      lastEventId: "evt-50",
      fullSyncCompleted: true,
      version: 2,
    });

    const cursor = manager.getCursor("conn-1");
    expect(cursor?.lastEventId).toBe("evt-50");
    expect(cursor?.version).toBe(2);
    expect(cursor?.fullSyncCompleted).toBe(true);
  });

  test("deleteCursor removes cursor", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      fullSyncCompleted: false,
      version: 0,
    });
    manager.deleteCursor("conn-1");
    expect(manager.getCursor("conn-1")).toBeNull();
  });

  test("deleteCursor for non-existent is no-op", () => {
    manager.deleteCursor("nonexistent");
    expect(manager.listCursors()).toEqual([]);
  });

  test("isStale returns true when cursor is old", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      lastTimestamp: Date.now() - 120_000,
      fullSyncCompleted: false,
      version: 0,
    });
    expect(manager.isStale("conn-1", 60_000)).toBe(true);
  });

  test("isStale returns false when cursor is fresh", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      lastTimestamp: Date.now(),
      fullSyncCompleted: false,
      version: 0,
    });
    expect(manager.isStale("conn-1", 60_000)).toBe(false);
  });

  test("isStale returns true for nonexistent cursor", () => {
    expect(manager.isStale("missing", 60_000)).toBe(true);
  });

  test("isStale returns true when cursor has no timestamp", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      fullSyncCompleted: false,
      version: 0,
    });
    expect(manager.isStale("conn-1", 60_000)).toBe(true);
  });

  test("listCursors returns all cursors", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      fullSyncCompleted: false,
      version: 0,
    });
    manager.saveCursor({
      connectorId: "conn-2",
      fullSyncCompleted: true,
      version: 3,
    });

    const cursors = manager.listCursors();
    expect(cursors.length).toBe(2);
    const ids = cursors.map((c) => c.connectorId).sort();
    expect(ids).toEqual(["conn-1", "conn-2"]);
  });

  test("listCursors returns empty array when none exist", () => {
    expect(manager.listCursors()).toEqual([]);
  });

  test("cursor with undefined optional fields round-trips correctly", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      fullSyncCompleted: false,
      version: 0,
    });

    const cursor = manager.getCursor("conn-1");
    expect(cursor?.lastEventId).toBeUndefined();
    expect(cursor?.lastTimestamp).toBeUndefined();
    expect(cursor?.merkleRoot).toBeUndefined();
  });

  test("saveCursor preserves merkleRoot field", () => {
    manager.saveCursor({
      connectorId: "conn-1",
      merkleRoot: "deadbeef",
      fullSyncCompleted: false,
      version: 0,
    });

    const cursor = manager.getCursor("conn-1");
    expect(cursor?.merkleRoot).toBe("deadbeef");
  });
});
