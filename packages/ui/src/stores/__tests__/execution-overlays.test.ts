import { describe, expect, it } from "bun:test";
import type { ExecutionTrace, StepExecution } from "@openbeam/types/canvas";
import { deriveExecutionOverlays } from "../use-execution-overlays";

function createExecution(
  overrides: Partial<ExecutionTrace> = {}
): ExecutionTrace {
  return {
    id: "exec-1",
    agentCanvasId: "canvas-1",
    status: "RUNNING",
    steps: [],
    startedAt: 1000,
    ...overrides,
  };
}

function createStep(overrides: Partial<StepExecution> = {}): StepExecution {
  return {
    nodeId: "node-1",
    nodeType: "llm",
    status: "RUNNING",
    startedAt: 1000,
    ...overrides,
  };
}

const EDGES = [
  { id: "e1", source: "n1", target: "n2" },
  { id: "e2", source: "n2", target: "n3" },
  { id: "e3", source: "n3", target: "n4" },
] as const;

describe("deriveExecutionOverlays", () => {
  it("returns undefined maps when no execution", () => {
    const result = deriveExecutionOverlays(null, false, EDGES);

    expect(result.nodeStatusMap).toBeUndefined();
    expect(result.edgeStateMap).toBeUndefined();
    expect(result.isActive).toBe(false);
  });

  it("returns undefined maps when not executing", () => {
    const exec = createExecution({ status: "COMPLETED" });
    const result = deriveExecutionOverlays(exec, false, EDGES);

    expect(result.nodeStatusMap).toBeUndefined();
    expect(result.edgeStateMap).toBeUndefined();
    expect(result.isActive).toBe(false);
  });

  it("maps RUNNING step to running node status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n1", status: "RUNNING" })],
    });
    const { nodeStatusMap, isActive } = deriveExecutionOverlays(
      exec,
      true,
      EDGES
    );

    expect(nodeStatusMap).toBeDefined();
    expect(nodeStatusMap?.n1).toBe("running");
    expect(isActive).toBe(true);
  });

  it("maps COMPLETED step to success node status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n1", status: "COMPLETED" })],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n1).toBe("success");
  });

  it("maps FAILED step to error node status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n2", status: "FAILED" })],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n2).toBe("error");
  });

  it("maps PENDING step to pending node status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n1", status: "PENDING" })],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n1).toBe("pending");
  });

  it("currentNodeId with WAITING_INPUT maps to waiting", () => {
    const exec = createExecution({
      status: "WAITING_INPUT",
      currentNodeId: "n2",
      steps: [],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n2).toBe("waiting");
  });

  it("currentNodeId with WAITING_APPROVAL maps to waiting", () => {
    const exec = createExecution({
      status: "WAITING_APPROVAL",
      currentNodeId: "n3",
      steps: [],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n3).toBe("waiting");
  });

  it("derives edge state from target node status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n2", status: "RUNNING" })],
    });
    const { edgeStateMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(edgeStateMap?.e1).toBe("running");
  });

  it("derives edge state from source node status when target unknown", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n1", status: "COMPLETED" })],
    });
    const { edgeStateMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(edgeStateMap?.e1).toBe("success");
  });

  it("omits edges where neither source nor target has status", () => {
    const exec = createExecution({
      steps: [createStep({ nodeId: "n1", status: "RUNNING" })],
    });
    const { edgeStateMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(edgeStateMap?.e2).toBeUndefined();
    expect(edgeStateMap?.e3).toBeUndefined();
  });

  it("maps multiple steps correctly", () => {
    const exec = createExecution({
      steps: [
        createStep({ nodeId: "n1", status: "COMPLETED" }),
        createStep({ nodeId: "n2", status: "RUNNING" }),
        createStep({ nodeId: "n3", status: "FAILED" }),
      ],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n1).toBe("success");
    expect(nodeStatusMap?.n2).toBe("running");
    expect(nodeStatusMap?.n3).toBe("error");
  });

  it("currentNodeId overrides step status", () => {
    const exec = createExecution({
      status: "RUNNING",
      currentNodeId: "n1",
      steps: [createStep({ nodeId: "n1", status: "COMPLETED" })],
    });
    const { nodeStatusMap } = deriveExecutionOverlays(exec, true, EDGES);

    expect(nodeStatusMap?.n1).toBe("running");
  });
});
