import { describe, expect, it } from "bun:test";
import { generateWorkflowId } from "../utils/workflow-id";

const TIMESTAMP_REGEX = /:\d+$/;

describe("Workflow ID Generation (Idempotency Fix)", () => {
  it("generates deterministic sync workflow IDs WITHOUT timestamps", () => {
    const connectorId = "conn_123";

    const id1 = generateWorkflowId({ type: "sync", connectorId });
    const id2 = generateWorkflowId({ type: "sync", connectorId });
    const id3 = generateWorkflowId({ type: "sync", connectorId });

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);

    expect(id1).toBe(`sync:${connectorId}`);

    expect(id1).not.toMatch(TIMESTAMP_REGEX);
  });

  it("different connectors get different workflow IDs", () => {
    const id1 = generateWorkflowId({ type: "sync", connectorId: "conn_abc" });
    const id2 = generateWorkflowId({ type: "sync", connectorId: "conn_xyz" });

    expect(id1).toBe("sync:conn_abc");
    expect(id2).toBe("sync:conn_xyz");
    expect(id1).not.toBe(id2);
  });

  it("sync workflow IDs are stable across time", () => {
    const connectorId = "conn_stable";

    const id1 = generateWorkflowId({ type: "sync", connectorId });

    // Simulate time passing
    const now = Date.now();
    while (Date.now() === now) {
      // Wait for next millisecond
    }

    const id2 = generateWorkflowId({ type: "sync", connectorId });

    expect(id1).toBe(id2);
    expect(id1).toBe(`sync:${connectorId}`);
  });

  it("other workflow types can still use timestamps if needed", () => {
    const timestamp = 1_706_742_000_000;

    const id = generateWorkflowId({
      type: "maintenance",
      timestamp,
    });

    expect(id).toContain(String(timestamp));
  });

  it("throws error when connectorId is missing for sync workflow", () => {
    expect(() => {
      generateWorkflowId({
        type: "sync",
        connectorId: undefined,
      });
    }).toThrow("connectorId required for sync");
  });

  it("generates deterministic canvas workflow IDs", () => {
    const executionId = "exec_canvas_123";

    const id1 = generateWorkflowId({ type: "canvas", executionId });
    const id2 = generateWorkflowId({ type: "canvas", executionId });

    expect(id1).toBe(id2);
    expect(id1).toBe(`canvas:${executionId}`);
  });

  it("throws error when executionId is missing for canvas workflow", () => {
    expect(() => {
      generateWorkflowId({
        type: "canvas",
        executionId: undefined,
      });
    }).toThrow("executionId required for canvas");
  });

  it("prevents concurrent execution scenario", () => {
    const connectorId = "conn_concurrent_test";

    const manualSync1 = generateWorkflowId({ type: "sync", connectorId });
    const manualSync2 = generateWorkflowId({ type: "sync", connectorId });

    expect(manualSync1).toBe(manualSync2);
    expect(manualSync1).toBe(`sync:${connectorId}`);
  });
});
