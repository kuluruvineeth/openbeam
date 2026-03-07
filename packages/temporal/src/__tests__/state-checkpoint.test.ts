import type { ExecutionTrace } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
} from "@openbeam/types/temporal";
import { describe, expect, it } from "vitest";
import {
  createCheckpoint,
  restoreFromCheckpoint,
} from "../workflows/canvas/state";

function createMinimalTrace(
  overrides: Partial<ExecutionTrace> = {}
): ExecutionTrace {
  return {
    id: "exec_1",
    agentCanvasId: "canvas_1",
    status: "RUNNING",
    steps: [],
    startedAt: 1_700_000_000_000,
    ...overrides,
  } as ExecutionTrace;
}

describe("createCheckpoint", () => {
  it("captures current node ID from trace", () => {
    const trace = createMinimalTrace({ currentNodeId: "node_5" });

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.currentNodeId).toBe("node_5");
  });

  it("captures null when no current node", () => {
    const trace = createMinimalTrace();

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.currentNodeId).toBeNull();
  });

  it("captures trace snapshot", () => {
    const trace = createMinimalTrace({
      steps: [
        { nodeId: "n1", nodeType: "transform", status: "COMPLETED" },
        { nodeId: "n2", nodeType: "filter", status: "RUNNING" },
      ] as ExecutionTrace["steps"],
      totalLatencyMs: 1500,
    });

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 3,
    });

    expect(checkpoint.traceSnapshot).toEqual({
      id: "exec_1",
      status: "RUNNING",
      stepsCount: 2,
      totalLatencyMs: 1500,
    });
  });

  it("serializes approval responses to array of entries", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    approvals.set("approval_1", {
      approvalId: "approval_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: 1_700_000_000_000,
    });

    const checkpoint = createCheckpoint({
      trace: createMinimalTrace(),
      approvalResponses: approvals,
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.approvalResponses).toEqual([
      [
        "approval_1",
        {
          approvalId: "approval_1",
          nodeId: "node_1",
          status: "APPROVED",
          timestamp: 1_700_000_000_000,
        },
      ],
    ]);
  });

  it("serializes input responses to array of entries", () => {
    const inputs = new Map<string, CanvasInputSignalPayload>();
    inputs.set("node_input", {
      nodeId: "node_input",
      values: { name: "test" },
      timestamp: 1_700_000_000_000,
    });

    const checkpoint = createCheckpoint({
      trace: createMinimalTrace(),
      approvalResponses: new Map(),
      inputResponses: inputs,
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.inputResponses ?? []).toHaveLength(1);
    expect(checkpoint.inputResponses?.[0]?.[0]).toBe("node_input");
  });

  it("serializes loop states to array of entries", () => {
    const loopStates = new Map<string, unknown>();
    loopStates.set("loop_1", { currentIndex: 3, maxIterations: 10 });
    loopStates.set("loop_2", { currentIndex: 0, maxIterations: 5 });

    const checkpoint = createCheckpoint({
      trace: createMinimalTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates,
      loopStack: ["loop_1"],
      continueAsNewCount: 0,
    });

    expect(checkpoint.loopStates).toHaveLength(2);
    expect(checkpoint.loopStack).toEqual(["loop_1"]);
  });

  it("increments continueAsNewCount", () => {
    const checkpoint = createCheckpoint({
      trace: createMinimalTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 5,
    });

    expect(checkpoint.continueAsNewCount).toBe(6);
  });

  it("creates defensive copy of loopStack", () => {
    const loopStack = ["loop_1", "loop_2"];

    const checkpoint = createCheckpoint({
      trace: createMinimalTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack,
      continueAsNewCount: 0,
    });

    loopStack.push("loop_3");
    expect(checkpoint.loopStack).toEqual(["loop_1", "loop_2"]);
  });
});

describe("restoreFromCheckpoint", () => {
  it("restores approval responses into provided map", () => {
    const checkpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "exec_1",
        status: "RUNNING" as const,
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [
        [
          "approval_1",
          {
            approvalId: "approval_1",
            nodeId: "node_1",
            status: "APPROVED",
            timestamp: 1_700_000_000_000,
          },
        ],
      ] as [string, CanvasApprovalSignalPayload][],
      inputResponses: [],
      loopStates: [],
      loopStack: [],
      continueAsNewCount: 1,
    };

    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();

    restoreFromCheckpoint(checkpoint, approvals, inputs);

    expect(approvals.size).toBe(1);
    expect(approvals.get("approval_1")?.status).toBe("APPROVED");
  });

  it("restores input responses into provided map", () => {
    const checkpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "exec_1",
        status: "RUNNING" as const,
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [],
      inputResponses: [
        [
          "node_input",
          {
            nodeId: "node_input",
            values: { answer: 42 },
            timestamp: 1_700_000_000_000,
          },
        ],
      ] as [string, CanvasInputSignalPayload][],
      loopStates: [],
      loopStack: [],
      continueAsNewCount: 1,
    };

    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();

    restoreFromCheckpoint(checkpoint, approvals, inputs);

    expect(inputs.size).toBe(1);
    expect(inputs.get("node_input")?.values).toEqual({ answer: 42 });
  });

  it("restores loop states", () => {
    const checkpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "exec_1",
        status: "RUNNING" as const,
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [],
      inputResponses: [],
      loopStates: [["loop_1", { currentIndex: 3, maxIterations: 10 }]] as [
        string,
        unknown,
      ][],
      loopStack: ["loop_1"],
      continueAsNewCount: 1,
    };

    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();

    const result = restoreFromCheckpoint(checkpoint, approvals, inputs);

    expect(result.loopStates.size).toBe(1);
    expect(result.loopStates.get("loop_1")).toEqual({
      currentIndex: 3,
      maxIterations: 10,
    });
    expect(result.loopStack).toEqual(["loop_1"]);
  });

  it("returns empty maps when checkpoint has no data", () => {
    const checkpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "exec_1",
        status: "RUNNING" as const,
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: undefined,
      inputResponses: undefined,
      loopStates: undefined,
      loopStack: undefined,
      continueAsNewCount: 0,
    };

    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();

    const result = restoreFromCheckpoint(
      checkpoint as unknown as Parameters<typeof restoreFromCheckpoint>[0],
      approvals,
      inputs
    );

    expect(approvals.size).toBe(0);
    expect(inputs.size).toBe(0);
    expect(result.loopStates.size).toBe(0);
    expect(result.loopStack).toEqual([]);
  });

  it("creates defensive copy of loopStack", () => {
    const loopStack = ["loop_1"];
    const checkpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "exec_1",
        status: "RUNNING" as const,
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [],
      inputResponses: [],
      loopStates: [],
      loopStack,
      continueAsNewCount: 1,
    };

    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();

    const result = restoreFromCheckpoint(checkpoint, approvals, inputs);
    loopStack.push("loop_2");

    expect(result.loopStack).toEqual(["loop_1"]);
  });
});
