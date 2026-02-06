import { beforeEach, describe, expect, it } from "vitest";
import { createMockDb, createMockDbActivities } from "./fixtures";

describe("Mock Fixtures", () => {
  describe("createMockDbActivities", () => {
    let mockDb: ReturnType<typeof createMockDbActivities>;

    beforeEach(() => {
      mockDb = createMockDbActivities();
      mockDb.reset();
    });

    it("createData stores and returns data", async () => {
      const result = await mockDb.createAgentCanvasExecutionData({}, "team-1", {
        payload: { test: "data" },
        sizeBytes: 100,
      });

      expect(result.id).toBe("data-1");
      expect(result.sizeBytes).toBe(100);
    });

    it("findData retrieves stored data", async () => {
      await mockDb.createAgentCanvasExecutionData({}, "team-1", {
        payload: { value: 42 },
      });

      const found = await mockDb.findAgentCanvasExecutionData(
        {},
        "exec-1",
        "data-1"
      );
      expect(found).toEqual({
        id: "data-1",
        payload: { value: 42 },
      });
    });

    it("findData returns null for unknown id", async () => {
      const found = await mockDb.findAgentCanvasExecutionData(
        {},
        "exec-1",
        "unknown"
      );
      expect(found).toBeNull();
    });

    it("createStep increments counter", async () => {
      const step1 = await mockDb.createAgentCanvasExecutionStep();
      const step2 = await mockDb.createAgentCanvasExecutionStep();

      expect(step1.id).toBe("step-1");
      expect(step2.id).toBe("step-2");
    });

    it("reset clears store and counters", async () => {
      await mockDb.createAgentCanvasExecutionData({}, "team-1", {
        payload: "test",
      });
      await mockDb.createAgentCanvasExecutionStep();

      mockDb.reset();

      const found = await mockDb.findAgentCanvasExecutionData(
        {},
        "exec-1",
        "data-1"
      );
      expect(found).toBeNull();

      const step = await mockDb.createAgentCanvasExecutionStep();
      expect(step.id).toBe("step-1");
    });
  });

  describe("createMockDb", () => {
    it("creates mock db with methods", () => {
      const db = createMockDb();

      expect(db.connector).toHaveProperty("findUnique");
      expect(db.connector).toHaveProperty("findMany");
      expect(db.agentCanvas).toHaveProperty("findUnique");
      expect(db.agentCanvasExecution).toHaveProperty("create");
    });

    it("connector.findMany returns empty array by default", () => {
      const db = createMockDb();
      const result = db.connector.findMany();
      expect(result).toEqual([]);
    });
  });
});
