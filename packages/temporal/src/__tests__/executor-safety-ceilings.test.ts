import type {
  ExecutionPlan,
  ExecutionPlanNode,
  ExecutionTrace,
  StrictAgentCanvasEdge,
} from "@openplane/types/canvas";
import type { AgentCanvasExecutionInput } from "@openplane/types/temporal/workflows";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SAFETY_CEILINGS } from "../config/constants";

const EXCEEDED_WALLCLOCK_RE = /exceeded.*wallclock time/i;
const EXCEEDED_NODE_EXECUTIONS_RE = /exceeded.*total node executions/i;
const LOOP_NESTING_EXCEEDED_RE = /loop nesting depth exceeded/i;

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
const mockExecuteLoopNode = vi.fn();

vi.mock("../workflows/canvas/utils/activity-proxies", () => ({
  executeActivities: {
    executeCanvasNode: (...args: unknown[]) =>
      mockExecuteCanvasNode(args[0] as { node: ExecutionPlanNode }),
    executeLoopNode: (...args: unknown[]) => mockExecuteLoopNode(args[0]),
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
    const source = nodeIds[i] ?? "";
    const target = nodeIds[i + 1] ?? "";
    edges.push({
      id: `edge-${i}`,
      source,
      target,
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
  mockExecuteLoopNode.mockReset();
});

describe("executor safety ceilings", () => {
  describe("wallclock timeout", () => {
    it("throws SafetyCeilingExceeded when totalLatencyMs exceeds MAX_EXECUTION_DURATION_MS", async () => {
      const startedAt = 1_700_000_000_000;
      const exceededCompletedAt =
        startedAt + SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS + 1;

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "done" },
          startedAt,
          completedAt: exceededCompletedAt,
          latencyMs: SAFETY_CEILINGS.MAX_EXECUTION_DURATION_MS + 1,
        })
      );

      const params = createExecuteParams({
        plan: createLinearPlan(["a"]),
        startedAt,
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        EXCEEDED_WALLCLOCK_RE
      );
    });

    it("allows execution within wallclock budget", async () => {
      const startedAt = 1_700_000_000_000;

      mockExecuteCanvasNode.mockImplementation(() =>
        Promise.resolve({
          output: { result: "done" },
          startedAt,
          completedAt: startedAt + 1000,
          latencyMs: 1000,
        })
      );

      const params = createExecuteParams({
        plan: createLinearPlan(["a"]),
        startedAt,
      });

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });
  });

  describe("node execution count", () => {
    it("throws SafetyCeilingExceeded when exceeding MAX_TOTAL_NODE_EXECUTIONS", async () => {
      const nodeCount = SAFETY_CEILINGS.MAX_TOTAL_NODE_EXECUTIONS + 2;
      const nodeIds = Array.from({ length: nodeCount }, (_, i) => `n${i}`);

      const params = createExecuteParams({
        plan: createLinearPlan(nodeIds),
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        EXCEEDED_NODE_EXECUTIONS_RE
      );
    });

    it("updates metrics.nodeExecutionCount during execution", async () => {
      const metrics = { nodeExecutionCount: 0 };
      const params = createExecuteParams({
        plan: createLinearPlan(["a", "b", "c"]),
        metrics,
      });

      await executePlanNodes(params);

      expect(metrics.nodeExecutionCount).toBeGreaterThan(0);
    });

    it("propagates count to metrics object on each iteration", async () => {
      const metrics = { nodeExecutionCount: 0 };
      const counts: number[] = [];

      mockExecuteCanvasNode.mockImplementation(() => {
        counts.push(metrics.nodeExecutionCount);
        return Promise.resolve({
          output: { result: "ok" },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
        });
      });

      const params = createExecuteParams({
        plan: createLinearPlan(["a", "b", "c"]),
        metrics,
      });

      await executePlanNodes(params);

      expect(counts[0]).toBe(1);
      expect(counts[1]).toBe(2);
      expect(counts[2]).toBe(3);
    });
  });

  describe("loop nesting depth", () => {
    it("throws SafetyCeilingExceeded when loop nesting exceeds MAX_LOOP_NESTING_DEPTH", async () => {
      const depth = SAFETY_CEILINGS.MAX_LOOP_NESTING_DEPTH + 1;
      const loopIds = Array.from({ length: depth }, (_, i) => `loop-${i}`);

      const nodes: ExecutionPlanNode[] = loopIds.map((id) => ({
        id,
        type: "loop" as const,
        data: {} as unknown,
        inbound: [] as string[],
        outbound: [] as string[],
      }));

      const endNode: ExecutionPlanNode = {
        id: "end",
        type: "end" as const,
        data: {} as unknown,
        inbound: [] as string[],
        outbound: [] as string[],
      };
      nodes.push(endNode);

      const edges: StrictAgentCanvasEdge[] = [];
      for (let i = 0; i < loopIds.length - 1; i++) {
        const source = loopIds[i] ?? "";
        const target = loopIds[i + 1] ?? "";
        edges.push({
          id: `edge-body-${i}`,
          source,
          target,
          sourceHandle: "body",
          type: "data" as const,
        } as StrictAgentCanvasEdge);
        edges.push({
          id: `edge-done-${i}`,
          source,
          target: "end",
          sourceHandle: "done",
          type: "data" as const,
        } as StrictAgentCanvasEdge);
      }
      const lastLoopId = loopIds.at(-1) ?? "";
      edges.push({
        id: "edge-last-body",
        source: lastLoopId,
        target: "end",
        sourceHandle: "body",
        type: "data" as const,
      } as StrictAgentCanvasEdge);
      edges.push({
        id: "edge-last-done",
        source: lastLoopId,
        target: "end",
        sourceHandle: "done",
        type: "data" as const,
      } as StrictAgentCanvasEdge);

      const plan: ExecutionPlan = {
        version: 1,
        startNodeId: loopIds[0] ?? "",
        endNodeIds: ["end"],
        nodes,
        edges,
        nodeOrder: [...loopIds, "end"],
      };

      let loopCallIndex = 0;
      mockExecuteLoopNode.mockImplementation(() => {
        const idx = loopCallIndex;
        loopCallIndex += 1;
        return Promise.resolve({
          branchId: "body",
          output: { iteration: idx },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
          loopState: {
            nodeId: loopIds[idx % loopIds.length],
            type: "times",
            startedAt: Date.now(),
            iteration: 1,
            index: 0,
          },
        });
      });

      const params = createExecuteParams({
        plan,
      });

      await expect(executePlanNodes(params)).rejects.toThrow(
        LOOP_NESTING_EXCEEDED_RE
      );
    });

    it("allows loop nesting within depth limit", async () => {
      const loopId = "loop-0";
      const bodyNodeId = "body-node";

      const nodes: ExecutionPlanNode[] = [
        {
          id: loopId,
          type: "loop" as const,
          data: {} as unknown,
          inbound: [] as string[],
          outbound: [] as string[],
        },
        {
          id: bodyNodeId,
          type: "transform" as const,
          data: {} as unknown,
          inbound: [] as string[],
          outbound: [] as string[],
        },
        {
          id: "end",
          type: "end" as const,
          data: {} as unknown,
          inbound: [] as string[],
          outbound: [] as string[],
        },
      ];

      const edges: StrictAgentCanvasEdge[] = [
        {
          id: "edge-body",
          source: loopId,
          target: bodyNodeId,
          sourceHandle: "body",
          type: "data" as const,
        } as StrictAgentCanvasEdge,
        {
          id: "edge-back",
          source: bodyNodeId,
          target: loopId,
          type: "data" as const,
        },
        {
          id: "edge-done",
          source: loopId,
          target: "end",
          sourceHandle: "done",
          type: "data" as const,
        } as StrictAgentCanvasEdge,
      ];

      const plan: ExecutionPlan = {
        version: 1,
        startNodeId: loopId,
        endNodeIds: ["end"],
        nodes,
        edges,
        nodeOrder: [loopId, bodyNodeId, "end"],
      };

      let loopCalls = 0;
      mockExecuteLoopNode.mockImplementation(() => {
        loopCalls += 1;
        const branchId = loopCalls <= 2 ? "body" : "done";
        return Promise.resolve({
          branchId,
          output:
            branchId === "done"
              ? { results: [1, 2] }
              : { iteration: loopCalls },
          startedAt: 1_700_000_000_000,
          completedAt: 1_700_000_000_010,
          latencyMs: 10,
          loopState:
            branchId === "body"
              ? {
                  nodeId: loopId,
                  type: "times",
                  startedAt: Date.now(),
                  iteration: loopCalls,
                  index: loopCalls - 1,
                }
              : undefined,
        });
      });

      const params = createExecuteParams({ plan });
      const result = await executePlanNodes(params);

      expect(result.cancelled).toBe(false);
    });
  });

  describe("metrics propagation", () => {
    it("does not fail when metrics is undefined", async () => {
      const params = createExecuteParams({
        plan: createLinearPlan(["a"]),
      });
      (params as unknown as Record<string, unknown>).metrics = undefined;

      const result = await executePlanNodes(params);
      expect(result.cancelled).toBe(false);
    });

    it("final nodeExecutionCount reflects all nodes visited", async () => {
      const metrics = { nodeExecutionCount: 0 };
      const params = createExecuteParams({
        plan: createLinearPlan(["a", "b"]),
        metrics,
      });

      await executePlanNodes(params);

      expect(metrics.nodeExecutionCount).toBe(3);
    });
  });
});
