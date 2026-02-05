import { describe, expect, it } from "bun:test";
import {
  extractConnectorId,
  generateWorkflowId,
  isActiveSync,
  parseWorkflowId,
} from "../utils/workflow-id";

describe("workflow-id utils", () => {
  describe("generateWorkflowId", () => {
    it("generates sync workflow id", () => {
      const id = generateWorkflowId({
        type: "sync",
        connectorId: "conn_123",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("sync:");
      expect(id).toContain("conn_123");
    });

    it("generates index workflow id", () => {
      const id = generateWorkflowId({
        type: "index",
        connectorId: "conn_456",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("index:");
      expect(id).toContain("conn_456");
    });

    it("generates file workflow id", () => {
      const id = generateWorkflowId({
        type: "file",
        documentId: "doc_789",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("file:");
      expect(id).toContain("doc_789");
    });

    it("generates webhook workflow id", () => {
      const id = generateWorkflowId({
        type: "webhook",
        connectorId: "conn_123",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("webhook:");
      expect(id).toContain("conn_123");
    });

    it("generates cleanup workflow id", () => {
      const id = generateWorkflowId({
        type: "cleanup",
        connectorId: "cleanup_conn",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("cleanup:");
    });

    it("generates agent workflow id", () => {
      const id = generateWorkflowId({
        type: "agent",
        agentId: "agent_001",
        sessionId: "sess_001",
        timestamp: 1_700_000_000_000,
      });

      expect(id).toContain("agent:");
    });

    it("includes timestamp component when not provided", () => {
      const id = generateWorkflowId({ type: "maintenance" });

      expect(id).toContain("maintenance:");
      const parts = id.split(":");
      const timestampPart = parts.at(-1);
      expect(timestampPart).toBeDefined();
      const timestamp = Number.parseInt(timestampPart ?? "0", 10);
      expect(timestamp).toBeGreaterThan(1_700_000_000_000);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("parseWorkflowId", () => {
    it("parses sync workflow id", () => {
      const id = "sync:conn_123:1700000000000";
      const parsed = parseWorkflowId(id);

      expect(parsed.type).toBe("sync");
      expect(parsed.entityId).toBe("conn_123");
    });

    it("parses file workflow id", () => {
      const id = "file:doc_789:1700000000000";
      const parsed = parseWorkflowId(id);

      expect(parsed.type).toBe("file");
      expect(parsed.entityId).toBe("doc_789");
    });

    it("throws on invalid format", () => {
      expect(() => parseWorkflowId("invalid")).toThrow();
    });
  });

  describe("extractConnectorId", () => {
    it("extracts connector id from sync workflow", () => {
      const connectorId = extractConnectorId("sync:conn_123:1700000000000");

      expect(connectorId).toBe("conn_123");
    });

    it("extracts connector id from index workflow", () => {
      const connectorId = extractConnectorId("index:conn_456:1700000000000");

      expect(connectorId).toBe("conn_456");
    });

    it("returns null for non-connector workflows", () => {
      const connectorId = extractConnectorId("file:doc_123:1700000000000");

      expect(connectorId).toBeNull();
    });
  });

  describe("isActiveSync", () => {
    it("returns true for sync workflow id", () => {
      expect(isActiveSync("sync:conn_123:1700000000000")).toBe(true);
    });

    it("returns false for other workflow types", () => {
      expect(isActiveSync("file:doc_123:1700000000000")).toBe(false);
      expect(isActiveSync("cleanup:conn:1700000000000")).toBe(false);
    });
  });
});
