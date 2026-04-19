import { describe, expect, it } from "vitest";
import { generateWorkflowId, parseWorkflowId } from "../utils/workflow-id";

describe("Computer workflow ID generation", () => {
  it("generates a deterministic workflowId from runId", () => {
    const runId = "run_abc123";

    const id1 = generateWorkflowId({ type: "computer", runId });
    const id2 = generateWorkflowId({ type: "computer", runId });

    expect(id1).toBe("computer:run_abc123");
    expect(id1).toBe(id2);
  });

  it("different runIds produce different workflowIds", () => {
    const id1 = generateWorkflowId({ type: "computer", runId: "run_one" });
    const id2 = generateWorkflowId({ type: "computer", runId: "run_two" });

    expect(id1).toBe("computer:run_one");
    expect(id2).toBe("computer:run_two");
    expect(id1).not.toBe(id2);
  });

  it("rejects missing runId", () => {
    expect(() => generateWorkflowId({ type: "computer" })).toThrow(
      "runId required for computer"
    );
  });

  it("rejects empty runId", () => {
    expect(() => generateWorkflowId({ type: "computer", runId: "" })).toThrow(
      "runId required for computer"
    );
  });

  it("workflowId is stable across timestamps (no suffix)", () => {
    const runId = "run_stable";
    const id1 = generateWorkflowId({
      type: "computer",
      runId,
      timestamp: 1_000_000,
    });
    const id2 = generateWorkflowId({
      type: "computer",
      runId,
      timestamp: 9_999_999,
    });

    expect(id1).toBe(id2);
  });

  it("parseWorkflowId round-trips computer IDs", () => {
    const original = generateWorkflowId({
      type: "computer",
      runId: "run_parse",
    });
    const parsed = parseWorkflowId(original);

    expect(parsed.type).toBe("computer");
    expect(parsed.entityId).toBe("run_parse");
  });

  it("handles runIds with dashes and underscores", () => {
    const id = generateWorkflowId({
      type: "computer",
      runId: "run_abc-123_def",
    });
    expect(id).toBe("computer:run_abc-123_def");
  });
});
