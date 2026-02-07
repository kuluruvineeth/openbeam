import type {
  ExecutionPlan,
  ExecutionPlanNode,
  ExecutionTrace,
  StrictAgentCanvasEdge,
} from "@openplane/types/canvas";
import type { ExecutionPolicy } from "@openplane/types/services/policy";
import type { AgentCanvasExecutionInput } from "@openplane/types/temporal/workflows";
import { beforeEach, describe, expect, it, vi } from "vitest";

const POLICY_BUDGET_DURATION_RE = /duration budget|budget.*duration/i;
const POLICY_BUDGET_TOOL_CALLS_RE = /tool.?call budget|budget.*tool.?call/i;
const POLICY_BUDGET_TOKENS_RE = /token budget|budget.*token/i;

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
const mockExecuteCanvasNode = vi.fn(
  (input: {
    node: ExecutionPlanNode;
  }): Promise<{
    output: unknown;
    startedAt: number;
    completedAt: number;
    latencyMs: number;
  }> => {
    const now = 1_700_000_000_000;
    return Promise.resolve({
      output: { result: `output-${input.node.id}` },
      startedAt: now,
      completedAt: now + 10,
      latencyMs: 10,
    });
  }
);

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
  overrides: Record<string, unknown> = {}
): AgentCanvasExecutionInput {
  return {
    executionId: "exec-1",
    agentCanvasId: "canvas-1",
    versionNumber: 1,
    teamId: "team-1",
    triggeredById: "user-1",
    canvas: { nodes: [], edges: [] },
    input: { data: "initial" },
    ...overrides,
  } as AgentCanvasExecutionInput;
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

function createPolicy(
  overrides: Partial<ExecutionPolicy> = {}
): ExecutionPolicy {
  return {
    maxTokenBudget: 0,
    maxDurationMs: 0,
    maxToolCalls: 0,
    maxConcurrentExecutions: 10,
    allowedToolCategories: [],
    blockedToolCategories: [],
    requireApprovalForCategories: [],
    maxStakesLevel: "high",
    ...overrides,
  };
}

function createExecuteParams(
  overrides: Partial<ExecutePlanParams> = {}
): ExecutePlanParams {
  const plan = createLinearPlan(["a", "b", "c"]);
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

describe("policy budget enforcement", () => {
  describe("duration budget", () => {
    it("throws PolicyBudgetExceeded when totalLatencyMs exceeds maxDurationMs", async () => {
      const startedAt = 1_700_000_000_000;
      const policy = createPolicy({ maxDurationMs: 5000 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "done" },
          startedAt,
          completedAt: startedAt + 6000,
          latencyMs: 6000,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a"]),
        startedAt,
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        POLICY_BUDGET_DURATION_RE
      );
    });

    it("allows execution within duration budget", async () => {
      const startedAt = 1_700_000_000_000;
      const policy = createPolicy({ maxDurationMs: 10_000 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "done" },
          startedAt,
          completedAt: startedAt + 1000,
          latencyMs: 1000,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a"]),
        startedAt,
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });

    it("skips duration check when maxDurationMs is 0", async () => {
      const startedAt = 1_700_000_000_000;
      const policy = createPolicy({ maxDurationMs: 0 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "done" },
          startedAt,
          completedAt: startedAt + 999_999,
          latencyMs: 999_999,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a"]),
        startedAt,
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });
  });

  describe("tool call budget", () => {
    it("throws PolicyBudgetExceeded when node execution count exceeds maxToolCalls", async () => {
      const policy = createPolicy({ maxToolCalls: 2 });

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b", "c"]),
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        POLICY_BUDGET_TOOL_CALLS_RE
      );
    });

    it("allows execution within tool call budget", async () => {
      const policy = createPolicy({ maxToolCalls: 10 });

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });

    it("skips tool call check when maxToolCalls is 0", async () => {
      const policy = createPolicy({ maxToolCalls: 0 });

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b", "c"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });
  });

  describe("token budget", () => {
    it("throws PolicyBudgetExceeded when cumulative tokens exceed maxTokenBudget", async () => {
      const policy = createPolicy({ maxTokenBudget: 100 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { tokenUsage: { total: 60 } },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b"]),
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        POLICY_BUDGET_TOKENS_RE
      );
    });

    it("allows execution within token budget", async () => {
      const policy = createPolicy({ maxTokenBudget: 200 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { tokenUsage: { total: 30 } },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });

    it("skips token check when maxTokenBudget is 0", async () => {
      const policy = createPolicy({ maxTokenBudget: 0 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { tokenUsage: { total: 999_999 } },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });

    it("skips token check when output has no tokenUsage", async () => {
      const policy = createPolicy({ maxTokenBudget: 10 });

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "no tokens tracked" },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
        })
      );

      const params = createExecuteParams({
        input: createTestInput({ policy }),
        plan: createLinearPlan(["a", "b"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });
  });

  describe("no policy", () => {
    it("executes normally without policy", async () => {
      const params = createExecuteParams({
        input: createTestInput(),
        plan: createLinearPlan(["a", "b"]),
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });
  });
});
