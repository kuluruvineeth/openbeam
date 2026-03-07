import type { ExecutionPlan, ExecutionTrace } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
} from "@openbeam/types/temporal";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers = new Map<unknown, (...args: unknown[]) => void>();

const { mockPatched } = vi.hoisted(() => ({
  mockPatched: vi.fn(),
}));

vi.mock("@temporalio/workflow", () => ({
  patched: mockPatched,
  setHandler: (signal: unknown, handler: (...args: unknown[]) => void) => {
    handlers.set(signal, handler);
  },
  defineSignal: (name: string) => Symbol.for(`signal:${name}`),
  defineQuery: (name: string) => Symbol.for(`query:${name}`),
}));

vi.mock("../config/constants", () => ({
  SAFETY_CEILINGS: {
    MAX_SIGNAL_QUEUE_SIZE: 1000,
  },
}));

vi.mock("../workflows/types", () => ({
  cancelSignal: Symbol.for("signal:cancel"),
  pauseSignal: Symbol.for("signal:pause"),
  resumeSignal: Symbol.for("signal:resume"),
  canvasApprovalSignal: Symbol.for("signal:canvasApproval"),
  canvasInputSignal: Symbol.for("signal:canvasInput"),
  canvasExecutionQuery: Symbol.for("query:canvasExecution"),
}));

import {
  type SignalMetrics,
  setupQueryHandlers,
  setupSignalHandlers,
} from "../workflows/canvas/signals";
import type { CanvasExecutionState } from "../workflows/canvas/state";

function getHandler(signalKey: string) {
  const sym = Symbol.for(signalKey);
  return handlers.get(sym);
}

function createState(): CanvasExecutionState {
  return { paused: false, cancelled: false };
}

function createMetrics(): SignalMetrics {
  return { droppedSignals: 0, nodeExecutionCount: 0 };
}

describe("setupSignalHandlers (v2 with validation)", () => {
  beforeEach(() => {
    handlers.clear();
    mockPatched.mockReturnValue(true);
  });

  it("registers all 5 signal handlers", () => {
    const state = createState();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    expect(getHandler("signal:cancel")).toBeDefined();
    expect(getHandler("signal:pause")).toBeDefined();
    expect(getHandler("signal:resume")).toBeDefined();
    expect(getHandler("signal:canvasApproval")).toBeDefined();
    expect(getHandler("signal:canvasInput")).toBeDefined();
  });

  it("cancel signal sets cancelled to true", () => {
    const state = createState();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:cancel")?.();
    expect(state.cancelled).toBe(true);
  });

  it("pause signal sets paused to true", () => {
    const state = createState();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:pause")?.();
    expect(state.paused).toBe(true);
  });

  it("pause signal does not set paused when cancelled", () => {
    const state = createState();
    state.cancelled = true;
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:pause")?.();
    expect(state.paused).toBe(false);
  });

  it("resume signal sets paused to false", () => {
    const state = createState();
    state.paused = true;
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:resume")?.();
    expect(state.paused).toBe(false);
  });

  it("approval signal stores valid payload", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: Date.now(),
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.get("appr_1")).toEqual(payload);
  });

  it("approval signal drops invalid payload", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics,
    });

    getHandler("signal:canvasApproval")?.("invalid-data");
    expect(approvals.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("approval signal drops when cancelled", () => {
    const state = createState();
    state.cancelled = true;
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics,
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: Date.now(),
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("approval signal drops when executionId does not match", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics,
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: Date.now(),
      executionId: "exec_different",
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("approval signal accepts when executionId matches", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: Date.now(),
      executionId: "exec_1",
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.size).toBe(1);
  });

  it("input signal stores valid payload", () => {
    const inputs = new Map<string, CanvasInputSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: inputs,
      metrics: createMetrics(),
    });

    const payload: CanvasInputSignalPayload = {
      nodeId: "input_1",
      values: { name: "test" },
      timestamp: Date.now(),
    };

    getHandler("signal:canvasInput")?.(payload);
    expect(inputs.get("input_1")).toEqual(payload);
  });

  it("input signal drops invalid payload", () => {
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: inputs,
      metrics,
    });

    getHandler("signal:canvasInput")?.(42);
    expect(inputs.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("input signal drops when cancelled", () => {
    const state = createState();
    state.cancelled = true;
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: inputs,
      metrics,
    });

    const payload: CanvasInputSignalPayload = {
      nodeId: "input_1",
      values: { name: "test" },
      timestamp: Date.now(),
    };

    getHandler("signal:canvasInput")?.(payload);
    expect(inputs.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("input signal drops when executionId does not match", () => {
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: inputs,
      metrics,
    });

    const payload: CanvasInputSignalPayload = {
      nodeId: "input_1",
      values: { name: "test" },
      timestamp: Date.now(),
      executionId: "exec_other",
    };

    getHandler("signal:canvasInput")?.(payload);
    expect(inputs.size).toBe(0);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("approval signal drops when signal queue is at capacity", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();

    for (let i = 0; i < 1000; i++) {
      approvals.set(`appr_${i}`, {
        approvalId: `appr_${i}`,
        nodeId: `node_${i}`,
        status: "APPROVED",
        timestamp: Date.now(),
      });
    }

    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: inputs,
      metrics,
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_overflow",
      nodeId: "node_overflow",
      status: "APPROVED",
      timestamp: Date.now(),
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.has("appr_overflow")).toBe(false);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("input signal drops when signal queue is at capacity", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();

    for (let i = 0; i < 1000; i++) {
      inputs.set(`node_${i}`, {
        nodeId: `node_${i}`,
        values: { v: i },
        timestamp: Date.now(),
      });
    }

    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: inputs,
      metrics,
    });

    const payload: CanvasInputSignalPayload = {
      nodeId: "input_overflow",
      values: { name: "overflow" },
      timestamp: Date.now(),
    };

    getHandler("signal:canvasInput")?.(payload);
    expect(inputs.has("input_overflow")).toBe(false);
    expect(metrics.droppedSignals).toBe(1);
  });

  it("signals accepted when combined queue is below capacity", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    const inputs = new Map<string, CanvasInputSignalPayload>();
    const metrics = createMetrics();

    for (let i = 0; i < 500; i++) {
      approvals.set(`appr_${i}`, {
        approvalId: `appr_${i}`,
        nodeId: `node_${i}`,
        status: "APPROVED",
        timestamp: Date.now(),
      });
    }

    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: inputs,
      metrics,
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_new",
      nodeId: "node_new",
      status: "APPROVED",
      timestamp: Date.now(),
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.has("appr_new")).toBe(true);
    expect(metrics.droppedSignals).toBe(0);
  });
});

describe("setupSignalHandlers (v1 legacy branch)", () => {
  beforeEach(() => {
    handlers.clear();
    mockPatched.mockReturnValue(false);
  });

  it("registers all 5 signal handlers", () => {
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    expect(getHandler("signal:cancel")).toBeDefined();
    expect(getHandler("signal:pause")).toBeDefined();
    expect(getHandler("signal:resume")).toBeDefined();
    expect(getHandler("signal:canvasApproval")).toBeDefined();
    expect(getHandler("signal:canvasInput")).toBeDefined();
  });

  it("cancel sets cancelled", () => {
    const state = createState();
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:cancel")?.();
    expect(state.cancelled).toBe(true);
  });

  it("pause sets paused without checking cancelled", () => {
    const state = createState();
    state.cancelled = true;
    setupSignalHandlers({
      state,
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    getHandler("signal:pause")?.();
    expect(state.paused).toBe(true);
  });

  it("legacy approval stores without validation", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "REJECTED",
      timestamp: Date.now(),
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.get("appr_1")?.status).toBe("REJECTED");
  });

  it("legacy approval drops for wrong executionId", () => {
    const approvals = new Map<string, CanvasApprovalSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: approvals,
      inputResponses: new Map(),
      metrics: createMetrics(),
    });

    const payload: CanvasApprovalSignalPayload = {
      approvalId: "appr_1",
      nodeId: "node_1",
      status: "APPROVED",
      timestamp: Date.now(),
      executionId: "exec_other",
    };

    getHandler("signal:canvasApproval")?.(payload);
    expect(approvals.size).toBe(0);
  });

  it("legacy input stores without validation", () => {
    const inputs = new Map<string, CanvasInputSignalPayload>();
    setupSignalHandlers({
      state: createState(),
      executionId: "exec_1",
      approvalResponses: new Map(),
      inputResponses: inputs,
      metrics: createMetrics(),
    });

    const payload: CanvasInputSignalPayload = {
      nodeId: "input_1",
      values: { answer: 42 },
      timestamp: Date.now(),
    };

    getHandler("signal:canvasInput")?.(payload);
    expect(inputs.get("input_1")?.values).toEqual({ answer: 42 });
  });
});

describe("setupQueryHandlers", () => {
  beforeEach(() => {
    handlers.clear();
    mockPatched.mockReturnValue(true);
  });

  function createTrace(
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

  function createPlan(nodeCount: number): ExecutionPlan {
    return {
      version: 1,
      startNodeId: "start",
      endNodeIds: ["end"],
      nodes: Array.from({ length: nodeCount }, (_, i) => ({
        id: `node_${i}`,
        type: "transform",
        data: {},
        inbound: [],
        outbound: [],
      })),
      edges: [],
      nodeOrder: [],
    } as unknown as ExecutionPlan;
  }

  it("registers query handler", () => {
    setupQueryHandlers({
      executionId: "exec_1",
      trace: createTrace(),
      plan: createPlan(3),
      state: createState(),
      metrics: createMetrics(),
      continueAsNewCount: 0,
    });

    expect(getHandler("query:canvasExecution")).toBeDefined();
  });

  it("returns correct execution state", () => {
    const trace = createTrace({
      currentNodeId: "node_2",
      steps: [
        {
          nodeId: "node_0",
          nodeType: "start",
          status: "COMPLETED",
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_100,
        },
        {
          nodeId: "node_1",
          nodeType: "transform",
          status: "FAILED",
          error: "timeout",
          startedAt: 1_700_000_000_100,
          completedAt: 1_700_000_000_200,
        },
        {
          nodeId: "node_2",
          nodeType: "tool",
          status: "RUNNING",
          startedAt: 1_700_000_000_200,
        },
      ] as ExecutionTrace["steps"],
    });

    const state = createState();
    state.paused = true;

    setupQueryHandlers({
      executionId: "exec_1",
      trace,
      plan: createPlan(5),
      state,
      metrics: { droppedSignals: 3, nodeExecutionCount: 42 },
      continueAsNewCount: 2,
    });

    const queryHandler = getHandler("query:canvasExecution") ?? (() => ({}));
    const result = queryHandler() as unknown as Record<string, unknown>;

    expect(result.executionId).toBe("exec_1");
    expect(result.status).toBe("RUNNING");
    expect(result.currentNodeId).toBe("node_2");
    expect(result.stepsCompleted).toBe(2);
    expect(result.stepsTotal).toBe(5);
    expect(result.isPaused).toBe(true);
    expect(result.isCancelled).toBe(false);
    expect(result.startedAt).toBe(1_700_000_000_000);
    expect(result.droppedSignals).toBe(3);
    expect(result.totalNodeExecutions).toBe(42);
    expect(result.continueAsNewCount).toBe(2);
  });

  it("returns totalNodeExecutions from metrics", () => {
    const trace = createTrace();
    const metrics = createMetrics();
    metrics.nodeExecutionCount = 150;

    setupQueryHandlers({
      executionId: "exec_1",
      trace,
      plan: createPlan(3),
      state: createState(),
      metrics,
      continueAsNewCount: 0,
    });

    const queryHandler = getHandler("query:canvasExecution") ?? (() => ({}));
    const result = queryHandler() as unknown as Record<string, unknown>;

    expect(result.totalNodeExecutions).toBe(150);
  });

  it("returns step details in query response", () => {
    const trace = createTrace({
      steps: [
        {
          nodeId: "n1",
          nodeType: "transform",
          status: "COMPLETED",
          startedAt: 1000,
          completedAt: 2000,
        },
      ] as ExecutionTrace["steps"],
    });

    setupQueryHandlers({
      executionId: "exec_1",
      trace,
      plan: createPlan(1),
      state: createState(),
      metrics: createMetrics(),
      continueAsNewCount: 0,
    });

    const queryHandler = getHandler("query:canvasExecution") ?? (() => ({}));
    const result = queryHandler() as unknown as Record<string, unknown>;
    const steps = result.steps as Record<string, unknown>[];

    expect(steps).toHaveLength(1);
    expect(steps[0]?.nodeId).toBe("n1");
    expect(steps[0]?.nodeType).toBe("transform");
    expect(steps[0]?.status).toBe("COMPLETED");
    expect(steps[0]?.startedAt).toBe(1000);
    expect(steps[0]?.completedAt).toBe(2000);
  });

  it("counts only COMPLETED and FAILED as stepsCompleted", () => {
    const trace = createTrace({
      steps: [
        { nodeId: "n1", nodeType: "start", status: "COMPLETED" },
        { nodeId: "n2", nodeType: "transform", status: "RUNNING" },
        { nodeId: "n3", nodeType: "tool", status: "FAILED" },
        { nodeId: "n4", nodeType: "approval", status: "WAITING_APPROVAL" },
      ] as ExecutionTrace["steps"],
    });

    setupQueryHandlers({
      executionId: "exec_1",
      trace,
      plan: createPlan(4),
      state: createState(),
      metrics: createMetrics(),
      continueAsNewCount: 0,
    });

    const queryHandler = getHandler("query:canvasExecution") ?? (() => ({}));
    const result = queryHandler() as unknown as Record<string, unknown>;

    expect(result.stepsCompleted).toBe(2);
  });
});
