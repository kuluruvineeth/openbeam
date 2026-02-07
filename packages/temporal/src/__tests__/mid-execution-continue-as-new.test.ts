import type {
  ExecutionPlan,
  ExecutionPlanNode,
  ExecutionTrace,
  StrictAgentCanvasEdge,
} from "@openplane/types/canvas";
import type { AgentCanvasExecutionInput } from "@openplane/types/temporal/workflows";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockWorkflowInfo } = vi.hoisted(() => ({
  mockWorkflowInfo: vi.fn(() => ({
    startTime: new Date(1_700_000_000_000),
    workflowId: "wf-test",
    runId: "run-test",
    historyLength: 0,
    continueAsNewSuggested: false,
    unsafe: { now: () => Date.now() },
  })),
}));

vi.mock("@temporalio/workflow", () => ({
  workflowInfo: mockWorkflowInfo,
  condition: vi.fn(async () => true),
  ApplicationFailure: {
    nonRetryable: (message: string, type: string) => {
      const error = new Error(message);
      error.name = type;
      return error;
    },
  },
  proxyActivities: () => new Proxy({}, { get: () => vi.fn() }),
  defineSignal: (name: string) => Symbol.for(`signal:${name}`),
  defineQuery: (name: string) => Symbol.for(`query:${name}`),
  setHandler: vi.fn(),
  patched: vi.fn(() => false),
  sleep: vi.fn(() => Promise.resolve()),
  startChild: vi.fn(),
  executeChild: vi.fn(),
  continueAsNew: vi.fn(),
}));

const mockUpdateCanvasExecution = vi.fn((_input?: unknown) =>
  Promise.resolve()
);
const mockExecuteCanvasNode = vi.fn((input: { node: ExecutionPlanNode }) => {
  const now = 1_700_000_000_000;
  return Promise.resolve({
    output: { result: `output-${input.node.id}` },
    startedAt: now,
    completedAt: now + 10,
    latencyMs: 10,
  });
});

vi.mock("../workflows/canvas/utils/activity-proxies", () => ({
  executeActivities: {
    executeCanvasNode: (...args: unknown[]) =>
      mockExecuteCanvasNode(args[0] as { node: ExecutionPlanNode }),
    executeLoopNode: vi.fn(),
    executeParallelSplitNode: vi.fn(),
    executeParallelJoinNode: vi.fn(),
    executeParallelMapNode: vi.fn(),
    resolveParallelMapBatch: vi.fn(),
    storeParallelMapOutput: vi.fn(),
  },
  executeNoRetryActivities: {
    executeCanvasNode: vi.fn(),
  },
  updateActivities: {
    updateCanvasExecution: (...args: unknown[]) =>
      mockUpdateCanvasExecution(args[0]),
  },
  stepActivities: {
    createCanvasExecutionStep: vi.fn(),
    updateCanvasExecutionStep: vi.fn(),
    createCanvasApproval: vi.fn(),
  },
  subWorkflowActivities: {
    prepareSubWorkflowExecution: vi.fn(),
    resolveSubWorkflowOutput: vi.fn(),
  },
}));

import {
  type ExecutePlanParams,
  executePlanNodes,
} from "../workflows/canvas/executor";
import {
  createCheckpoint,
  restoreFromCheckpoint,
} from "../workflows/canvas/state";

function createTestTrace(
  overrides: Partial<ExecutionTrace> = {}
): ExecutionTrace {
  return {
    id: "trace-1",
    agentCanvasId: "canvas-1",
    status: "RUNNING",
    startedAt: 1_700_000_000_000,
    totalLatencyMs: 0,
    steps: [],
    ...overrides,
  } as ExecutionTrace;
}

function createTestInput(
  overrides: Partial<AgentCanvasExecutionInput> = {}
): AgentCanvasExecutionInput {
  return {
    executionId: "exec-1",
    agentCanvasId: "canvas-1",
    versionNumber: 1,
    teamId: "team-1",
    triggeredById: "user-1",
    input: { data: "initial" },
    canvas: { nodes: [], edges: [] },
    ...overrides,
  };
}

function createLinearPlan(nodeIds: string[]): ExecutionPlan {
  const endNodeId = `${nodeIds.at(-1)}-end`;
  const allIds = [...nodeIds, endNodeId];
  const nodes: ExecutionPlanNode[] = [
    ...nodeIds.map((id) => ({
      id,
      type: "transform" as const,
      data: {} as unknown,
      inbound: [] as string[],
      outbound: [] as string[],
    })),
    {
      id: endNodeId,
      type: "end" as const,
      data: {} as unknown,
      inbound: [] as string[],
      outbound: [] as string[],
    },
  ];

  const edges: StrictAgentCanvasEdge[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    edges.push({
      id: `edge-${i}`,
      source: nodeIds[i] ?? "",
      target: nodeIds[i + 1] ?? "",
      type: "data" as const,
    });
  }
  edges.push({
    id: "edge-end",
    source: nodeIds.at(-1) ?? "",
    target: endNodeId,
    type: "data" as const,
  });

  return {
    version: 1,
    startNodeId: nodeIds[0] ?? "",
    endNodeIds: [endNodeId],
    nodes,
    edges,
    nodeOrder: allIds,
  };
}

function createExecuteParams(
  overrides: Partial<ExecutePlanParams> = {}
): ExecutePlanParams {
  const plan = createLinearPlan(["a", "b", "c", "d", "e"]);
  return {
    input: createTestInput(),
    plan,
    trace: createTestTrace(),
    state: { paused: false, cancelled: false },
    approvalResponses: new Map(),
    inputResponses: new Map(),
    startedAt: 1_700_000_000_000,
    agentCanvasExecutionWorkflow: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockWorkflowInfo.mockReturnValue({
    startTime: new Date(1_700_000_000_000),
    workflowId: "wf-test",
    runId: "run-test",
    historyLength: 0,
    continueAsNewSuggested: false,
    unsafe: { now: () => Date.now() },
  });
  mockUpdateCanvasExecution.mockClear();
  mockExecuteCanvasNode.mockReset();
  mockExecuteCanvasNode.mockImplementation(
    (input: { node: ExecutionPlanNode }) => {
      const now = 1_700_000_000_000;
      return Promise.resolve({
        output: { result: `output-${input.node.id}` },
        startedAt: now,
        completedAt: now + 10,
        latencyMs: 10,
      });
    }
  );
});

describe("mid-execution continue-as-new", () => {
  it("executor breaks on threshold when shouldContinueAsNew fires", async () => {
    let nodeCount = 0;
    const params = createExecuteParams({
      plan: createLinearPlan(["a", "b", "c", "d", "e"]),
      shouldContinueAsNew: () => {
        nodeCount += 1;
        return nodeCount >= 3;
      },
    });

    const result = await executePlanNodes(params);

    expect(result.continueAsNewRequested).toBe(true);
    expect(result.nextNodeId).toBe("d");
    expect(mockExecuteCanvasNode).toHaveBeenCalledTimes(3);

    const executedIds = mockExecuteCanvasNode.mock.calls.map(
      (call) => (call[0] as { node: ExecutionPlanNode }).node.id
    );
    expect(executedIds).toEqual(["a", "b", "c"]);
  });

  it("resumes from checkpoint position using resumeFromNodeId", async () => {
    const params = createExecuteParams({
      plan: createLinearPlan(["a", "b", "c", "d", "e"]),
      resumeFromNodeId: "c",
      resumePayload: { data: "resumed-payload" },
    });

    const result = await executePlanNodes(params);

    expect(result.continueAsNewRequested).toBe(false);

    const executedIds = mockExecuteCanvasNode.mock.calls.map(
      (call) => (call[0] as { node: ExecutionPlanNode }).node.id
    );
    expect(executedIds).toEqual(["c", "d", "e", "e-end"]);

    const firstCallArgs = mockExecuteCanvasNode.mock
      .calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(firstCallArgs.input).toEqual({ data: "resumed-payload" });
  });

  it("checkpoint includes payload fields when provided", () => {
    const trace = createTestTrace({ currentNodeId: "node-b" });

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
      currentPayload: { key: "payload-value" },
      lastStepOutput: { key: "output-value" },
      nextNodeId: "node-c",
    });

    expect(checkpoint.currentPayload).toEqual({ key: "payload-value" });
    expect(checkpoint.lastStepOutput).toEqual({ key: "output-value" });
    expect(checkpoint.currentNodeId).toBe("node-c");
  });

  it("nextNodeId overrides trace.currentNodeId in checkpoint", () => {
    const trace = createTestTrace({ currentNodeId: "node-b" });

    const withOverride = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
      nextNodeId: "node-d",
    });
    expect(withOverride.currentNodeId).toBe("node-d");

    const withoutOverride = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map(),
      loopStack: [],
      continueAsNewCount: 0,
    });
    expect(withoutOverride.currentNodeId).toBe("node-b");
  });

  it("completes fully when shouldContinueAsNew never triggers", async () => {
    const params = createExecuteParams({
      plan: createLinearPlan(["a", "b", "c"]),
      shouldContinueAsNew: () => false,
    });

    const result = await executePlanNodes(params);

    expect(result.continueAsNewRequested).toBe(false);
    const executedIds = mockExecuteCanvasNode.mock.calls.map(
      (call) => (call[0] as { node: ExecutionPlanNode }).node.id
    );
    expect(executedIds).toEqual(["a", "b", "c", "c-end"]);
  });

  it("round-trip: checkpoint with payload survives create then restore then resume", async () => {
    const trace = createTestTrace({ currentNodeId: "c" });

    const checkpoint = createCheckpoint({
      trace,
      approvalResponses: new Map(),
      inputResponses: new Map(),
      loopStates: new Map<string, unknown>([
        [
          "loop-1",
          {
            nodeId: "loop-1",
            type: "times",
            startedAt: 2000,
            iteration: 3,
            index: 3,
          },
        ],
      ]),
      loopStack: ["loop-1"],
      continueAsNewCount: 1,
      currentPayload: { step: "c-input" },
      lastStepOutput: { step: "b-output" },
      nextNodeId: "d",
    });

    expect(checkpoint.currentNodeId).toBe("d");
    expect(checkpoint.currentPayload).toEqual({ step: "c-input" });
    expect(checkpoint.lastStepOutput).toEqual({ step: "b-output" });

    const approvals = new Map();
    const inputs = new Map();
    const { loopStates, loopStack } = restoreFromCheckpoint(
      checkpoint,
      approvals,
      inputs
    );

    expect(loopStates.get("loop-1")).toEqual(
      expect.objectContaining({ iteration: 3 })
    );
    expect(loopStack).toEqual(["loop-1"]);

    const resumeParams = createExecuteParams({
      plan: createLinearPlan(["a", "b", "c", "d", "e"]),
      resumeFromNodeId: checkpoint.currentNodeId,
      resumePayload: checkpoint.currentPayload,
      resumeLastStepOutput: checkpoint.lastStepOutput,
      initialLoopStates: loopStates,
      initialLoopStack: loopStack,
    });

    const result = await executePlanNodes(resumeParams);

    expect(result.continueAsNewRequested).toBe(false);
    const executedIds = mockExecuteCanvasNode.mock.calls.map(
      (call) => (call[0] as { node: ExecutionPlanNode }).node.id
    );
    expect(executedIds).toEqual(["d", "e", "e-end"]);
  });
});
