import type { ExecutionTrace } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
  LoopState,
} from "@openbeam/types/temporal";
import type { CanvasExecutionCheckpoint } from "@openbeam/types/temporal/workflows";
import { describe, expect, it } from "vitest";
import {
  createCheckpoint,
  restoreFromCheckpoint,
} from "../workflows/canvas/state";

function createTestTrace(
  overrides: Partial<ExecutionTrace> = {}
): ExecutionTrace {
  return {
    id: "trace-1",
    executionId: "exec-1",
    status: "RUNNING",
    startedAt: 1000,
    totalLatencyMs: 500,
    steps: [],
    ...overrides,
  } as ExecutionTrace;
}

function makeApproval(
  id: string,
  extra: Record<string, unknown> = {}
): CanvasApprovalSignalPayload {
  return {
    approvalId: id,
    nodeId: `node-${id}`,
    status: "APPROVED",
    timestamp: Date.now(),
    ...extra,
  } as unknown as CanvasApprovalSignalPayload;
}

function makeInput(
  nodeId: string,
  extra: Record<string, unknown> = {}
): CanvasInputSignalPayload {
  return {
    nodeId,
    timestamp: Date.now(),
    values: { field: "test" },
    ...extra,
  } as unknown as CanvasInputSignalPayload;
}

function makeLoopState(overrides: Partial<LoopState> = {}): LoopState {
  return {
    nodeId: "loop-node",
    type: "times" as const,
    startedAt: 2000,
    iteration: 0,
    index: 0,
    ...overrides,
  } as LoopState;
}

describe("createCheckpoint", () => {
  it("serializes approval and input responses as arrays", () => {
    const approval = makeApproval("approval-1", { executionId: "exec-1" });
    const input = makeInput("node-1", { executionId: "exec-1" });

    const approvalResponses = new Map<string, CanvasApprovalSignalPayload>([
      ["approval-1", approval],
    ]);
    const inputResponses = new Map<string, CanvasInputSignalPayload>([
      ["node-1", input],
    ]);

    const checkpoint = createCheckpoint({
      trace: createTestTrace(),
      approvalResponses,
      inputResponses,
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.approvalResponses).toEqual([["approval-1", approval]]);
    expect(checkpoint.inputResponses).toEqual([["node-1", input]]);
  });

  it("preserves loop states across checkpoint boundary", () => {
    const loopState = makeLoopState({ iteration: 5 });
    const loopStates = new Map<string, unknown>([["loop-1", loopState]]);

    const checkpoint = createCheckpoint({
      trace: createTestTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates,
      loopStack: ["loop-1"],
      continueAsNewCount: 2,
    });

    expect(checkpoint.loopStates).toEqual([["loop-1", loopState]]);
    expect(checkpoint.loopStack).toEqual(["loop-1"]);
  });

  it("increments continueAsNewCount", () => {
    const checkpoint = createCheckpoint({
      trace: createTestTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 3,
    });

    expect(checkpoint.continueAsNewCount).toBe(4);
  });

  it("captures trace snapshot with current node", () => {
    const trace = createTestTrace({
      currentNodeId: "node-transform-1",
      status: "RUNNING",
      steps: [
        { nodeId: "node-1", status: "COMPLETED" } as never,
        { nodeId: "node-2", status: "COMPLETED" } as never,
      ],
    });

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.currentNodeId).toBe("node-transform-1");
    expect(checkpoint.traceSnapshot.stepsCount).toBe(2);
    expect(checkpoint.traceSnapshot.status).toBe("RUNNING");
  });

  it("handles empty maps gracefully", () => {
    const checkpoint = createCheckpoint({
      trace: createTestTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });

    expect(checkpoint.approvalResponses).toEqual([]);
    expect(checkpoint.inputResponses).toEqual([]);
    expect(checkpoint.loopStates).toEqual([]);
    expect(checkpoint.loopStack).toEqual([]);
    expect(checkpoint.continueAsNewCount).toBe(1);
  });
});

describe("restoreFromCheckpoint", () => {
  it("restores approval and input responses into provided maps", () => {
    const approval = makeApproval("a-1");
    const input = makeInput("n-1");

    const checkpoint: CanvasExecutionCheckpoint = {
      currentNodeId: "node-1",
      traceSnapshot: {
        id: "t-1",
        status: "RUNNING",
        stepsCount: 2,
        totalLatencyMs: 100,
      },
      approvalResponses: [["a-1", approval]],
      inputResponses: [["n-1", input]],
      loopStates: [],
      loopStack: [],
      continueAsNewCount: 1,
    };

    const approvalMap = new Map<string, CanvasApprovalSignalPayload>();
    const inputMap = new Map<string, CanvasInputSignalPayload>();

    restoreFromCheckpoint(checkpoint, approvalMap, inputMap);

    expect(approvalMap.size).toBe(1);
    expect(approvalMap.get("a-1")).toEqual(approval);
    expect(inputMap.size).toBe(1);
    expect(inputMap.get("n-1")).toEqual(input);
  });

  it("restores loop states and loop stack", () => {
    const loopState = makeLoopState({ iteration: 3, startedAt: 5000 });

    const checkpoint: CanvasExecutionCheckpoint = {
      currentNodeId: "loop-1",
      traceSnapshot: {
        id: "t-1",
        status: "RUNNING",
        stepsCount: 5,
        totalLatencyMs: 300,
      },
      approvalResponses: [],
      inputResponses: [],
      loopStates: [["loop-1", loopState]],
      loopStack: ["loop-1"],
      continueAsNewCount: 2,
    };

    const { loopStates, loopStack } = restoreFromCheckpoint(
      checkpoint,
      new Map(),
      new Map()
    );

    expect(loopStates.size).toBe(1);
    expect(loopStates.get("loop-1")).toEqual(loopState);
    expect(loopStack).toEqual(["loop-1"]);
  });

  it("returns empty loop states when checkpoint has none", () => {
    const checkpoint: CanvasExecutionCheckpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "t-1",
        status: "RUNNING",
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [],
      inputResponses: [],
      loopStates: [],
      loopStack: [],
      continueAsNewCount: 0,
    };

    const { loopStates, loopStack } = restoreFromCheckpoint(
      checkpoint,
      new Map(),
      new Map()
    );

    expect(loopStates.size).toBe(0);
    expect(loopStack).toEqual([]);
  });

  it("does not mutate the checkpoint object", () => {
    const originalStack = ["loop-a", "loop-b"];
    const checkpoint: CanvasExecutionCheckpoint = {
      currentNodeId: "node-1",
      traceSnapshot: {
        id: "t-1",
        status: "RUNNING",
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [],
      inputResponses: [],
      loopStates: [],
      loopStack: originalStack,
      continueAsNewCount: 1,
    };

    const { loopStack } = restoreFromCheckpoint(
      checkpoint,
      new Map(),
      new Map()
    );

    loopStack.push("loop-c");

    expect(checkpoint.loopStack).toEqual(["loop-a", "loop-b"]);
  });

  it("merges into existing maps without overwriting pre-existing entries", () => {
    const existingApproval = makeApproval("a-1");
    const newApproval = makeApproval("a-2", { status: "REJECTED" });

    const checkpoint: CanvasExecutionCheckpoint = {
      currentNodeId: null,
      traceSnapshot: {
        id: "t-1",
        status: "RUNNING",
        stepsCount: 0,
        totalLatencyMs: 0,
      },
      approvalResponses: [["a-2", newApproval]],
      inputResponses: [],
      loopStates: [],
      loopStack: [],
      continueAsNewCount: 0,
    };

    const approvalMap = new Map<string, CanvasApprovalSignalPayload>([
      ["a-1", existingApproval],
    ]);

    restoreFromCheckpoint(checkpoint, approvalMap, new Map());

    expect(approvalMap.size).toBe(2);
    expect(approvalMap.get("a-1")).toEqual(existingApproval);
    expect(approvalMap.get("a-2")).toEqual(newApproval);
  });
});

describe("checkpoint round-trip", () => {
  it("preserves data through create then restore cycle", () => {
    const loopState = makeLoopState({ iteration: 7 });
    const approval = makeApproval("a-1", { executionId: "e-1" });
    const input = makeInput("n-1", { executionId: "e-1" });

    const originalApprovals = new Map<string, CanvasApprovalSignalPayload>([
      ["a-1", approval],
    ]);
    const originalInputs = new Map<string, CanvasInputSignalPayload>([
      ["n-1", input],
    ]);
    const originalLoopStates = new Map<string, unknown>([
      ["loop-a", loopState],
    ]);

    const checkpoint = createCheckpoint({
      trace: createTestTrace({ currentNodeId: "node-5" }),
      approvalResponses: originalApprovals,
      inputResponses: originalInputs,
      loopStates: originalLoopStates,
      loopStack: ["loop-a"],
      continueAsNewCount: 4,
    });

    const restoredApprovals = new Map<string, CanvasApprovalSignalPayload>();
    const restoredInputs = new Map<string, CanvasInputSignalPayload>();

    const { loopStates, loopStack } = restoreFromCheckpoint(
      checkpoint,
      restoredApprovals,
      restoredInputs
    );

    expect(restoredApprovals.get("a-1")).toEqual(approval);
    expect(restoredInputs.get("n-1")).toEqual(input);
    expect(loopStates.get("loop-a")).toEqual(loopState);
    expect(loopStack).toEqual(["loop-a"]);
    expect(checkpoint.continueAsNewCount).toBe(5);
  });

  it("handles multiple loop states across continue-as-new boundaries", () => {
    const loopStateA = makeLoopState({
      nodeId: "loop-a",
      iteration: 2,
      startedAt: 1000,
    });
    const loopStateB = makeLoopState({
      nodeId: "loop-b",
      iteration: 8,
      startedAt: 2000,
    });

    const loopStates = new Map<string, unknown>([
      ["loop-a", loopStateA],
      ["loop-b", loopStateB],
    ]);

    const checkpoint = createCheckpoint({
      trace: createTestTrace(),
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates,
      loopStack: ["loop-a", "loop-b"],
      continueAsNewCount: 0,
    });

    const { loopStates: restored, loopStack } = restoreFromCheckpoint(
      checkpoint,
      new Map(),
      new Map()
    );

    expect(restored.size).toBe(2);
    expect(restored.get("loop-a")).toEqual(loopStateA);
    expect(restored.get("loop-b")).toEqual(loopStateB);
    expect(loopStack).toEqual(["loop-a", "loop-b"]);
  });
});
