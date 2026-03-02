/**
 * Canvas Execution Integration Tests
 *
 * These tests require Node.js runtime with vitest. Bun is not compatible with
 * the Temporal TypeScript SDK Worker due to missing v8 worker sandbox support.
 * See: https://github.com/temporalio/sdk-typescript/issues/1334
 *
 * Run with:
 *   cd packages/temporal && bun run test:integration
 *   # or
 *   npx vitest run --config vitest.integration.config.ts
 */

import { fileURLToPath } from "node:url";
import type {
  AgentCanvasExecutionInput,
  AgentCanvasExecutionOutput,
  CreateCanvasApprovalInput,
  CreateCanvasApprovalOutput,
  CreateCanvasExecutionStepInput,
  CreateCanvasExecutionStepOutput,
  ExecuteCanvasNodeInput,
  ExecuteCanvasNodeOutput,
  ExecuteLoopNodeInput,
  ExecuteLoopNodeOutput,
  ExecuteParallelJoinNodeInput,
  ExecuteParallelJoinNodeOutput,
  ExecuteParallelMapNodeInput,
  ExecuteParallelMapNodeOutput,
  ExecuteParallelSplitNodeInput,
  ExecuteParallelSplitNodeOutput,
  PrepareSubWorkflowExecutionInput,
  PrepareSubWorkflowExecutionOutput,
  ResolveParallelMapBatchInput,
  ResolveParallelMapBatchOutput,
  ResolveSubWorkflowOutput,
  ResolveSubWorkflowOutputInput,
  StoreParallelMapOutputInput,
  StoreParallelMapOutputOutput,
  UpdateCanvasExecutionInput,
  UpdateCanvasExecutionStepInput,
  UpdateCanvasExecutionStepOutput,
} from "@openplane/types/temporal";
import type { WorkflowHandle } from "@temporalio/client";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LogAuditEventInput } from "../audit/types";
import {
  cancelSignal,
  canvasApprovalSignal,
  canvasExecutionQuery,
  pauseSignal,
  resumeSignal,
} from "../workflows/types";

const executedNodes: string[] = [];
const executionUpdates: UpdateCanvasExecutionInput[] = [];
const auditEvents: LogAuditEventInput[] = [];
const nodeAttempts = new Map<string, number>();
const parallelMapCollections = new Map<string, unknown[]>();
const approvalRecords = new Map<
  string,
  { approvalId: string; nodeId: string }
>();
let loopMaxIterations = 3;
let flakyNodeId: string | null = null;
let failAfterAttempts = 2;

const simpleCanvas: AgentCanvasExecutionInput["canvas"] = {
  nodes: [
    { id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
    { id: "action", type: "transform", position: { x: 120, y: 0 }, data: {} },
    { id: "end", type: "end", position: { x: 240, y: 0 }, data: {} },
  ],
  edges: [
    { id: "e1", source: "start", target: "action" },
    { id: "e2", source: "action", target: "end" },
  ],
};

const approvalCanvas: AgentCanvasExecutionInput["canvas"] = {
  nodes: [
    { id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
    {
      id: "approval",
      type: "approval",
      position: { x: 120, y: 0 },
      data: {
        config: {
          message: "Approval required",
          approvalType: "single",
          requiredApprovals: 1,
          allowedActions: ["approve", "reject"],
          timeoutAction: "reject",
        },
      },
    },
    {
      id: "approved-action",
      type: "transform",
      position: { x: 240, y: -40 },
      data: {},
    },
    {
      id: "rejected-action",
      type: "transform",
      position: { x: 240, y: 40 },
      data: {},
    },
    { id: "end", type: "end", position: { x: 360, y: 0 }, data: {} },
  ],
  edges: [
    { id: "a1", source: "start", target: "approval" },
    {
      id: "a2",
      source: "approval",
      target: "approved-action",
      sourceHandle: "approved",
    },
    {
      id: "a3",
      source: "approval",
      target: "rejected-action",
      sourceHandle: "rejected",
    },
    { id: "a4", source: "approved-action", target: "end" },
    { id: "a5", source: "rejected-action", target: "end" },
  ],
};

const loopCanvas: AgentCanvasExecutionInput["canvas"] = {
  nodes: [
    { id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
    {
      id: "loop",
      type: "loop",
      position: { x: 120, y: 0 },
      data: {
        config: {
          type: "times",
          times: 3,
          executionMode: "sequential",
          errorHandling: "stop",
          outputMode: "all",
        },
      },
    },
    { id: "body", type: "transform", position: { x: 240, y: 0 }, data: {} },
    { id: "end", type: "end", position: { x: 360, y: 0 }, data: {} },
  ],
  edges: [
    { id: "l1", source: "start", target: "loop" },
    { id: "l2", source: "loop", target: "body", sourceHandle: "body" },
    { id: "l3", source: "body", target: "loop" },
    { id: "l4", source: "loop", target: "end", sourceHandle: "done" },
  ],
};

const parallelCanvas: AgentCanvasExecutionInput["canvas"] = {
  nodes: [
    { id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
    {
      id: "split",
      type: "parallel_split",
      position: { x: 120, y: 0 },
      data: {
        config: {
          branches: [
            { id: "branch-a", label: "A" },
            { id: "branch-b", label: "B" },
            { id: "branch-c", label: "C" },
          ],
          dataDistribution: "broadcast",
          executionMode: "parallel",
          maxConcurrency: 3,
          waitForAll: true,
          errorHandling: "failFast",
        },
      },
    },
    {
      id: "branch-a",
      type: "transform",
      position: { x: 240, y: -60 },
      data: {},
    },
    {
      id: "branch-b",
      type: "transform",
      position: { x: 240, y: 0 },
      data: {},
    },
    {
      id: "branch-c",
      type: "transform",
      position: { x: 240, y: 60 },
      data: {},
    },
    {
      id: "join",
      type: "parallel_join",
      position: { x: 360, y: 0 },
      data: {
        config: {
          inputs: [
            { id: "input-1", label: "A" },
            { id: "input-2", label: "B" },
            { id: "input-3", label: "C" },
          ],
          joinMode: "waitForAll",
          mergeStrategy: "append",
          emptyBranchHandling: "includeEmpty",
          errorHandling: "failFast",
        },
      },
    },
    { id: "end", type: "end", position: { x: 480, y: 0 }, data: {} },
  ],
  edges: [
    { id: "p1", source: "start", target: "split" },
    {
      id: "p2",
      source: "split",
      target: "branch-a",
      sourceHandle: "branch-a",
    },
    {
      id: "p3",
      source: "split",
      target: "branch-b",
      sourceHandle: "branch-b",
    },
    {
      id: "p4",
      source: "split",
      target: "branch-c",
      sourceHandle: "branch-c",
    },
    {
      id: "p5",
      source: "branch-a",
      target: "join",
      targetHandle: "input-1",
    },
    {
      id: "p6",
      source: "branch-b",
      target: "join",
      targetHandle: "input-2",
    },
    {
      id: "p7",
      source: "branch-c",
      target: "join",
      targetHandle: "input-3",
    },
    { id: "p8", source: "join", target: "end" },
  ],
};

const retryCanvas: AgentCanvasExecutionInput["canvas"] = {
  nodes: [
    { id: "start", type: "start", position: { x: 0, y: 0 }, data: {} },
    { id: "flaky", type: "transform", position: { x: 120, y: 0 }, data: {} },
    { id: "end", type: "end", position: { x: 240, y: 0 }, data: {} },
  ],
  edges: [
    { id: "r1", source: "start", target: "flaky" },
    { id: "r2", source: "flaky", target: "end" },
  ],
};

function createExecutionInput(params: {
  executionId: string;
  agentCanvasId: string;
  canvas: AgentCanvasExecutionInput["canvas"];
  input?: unknown;
}): AgentCanvasExecutionInput {
  return {
    executionId: params.executionId,
    agentCanvasId: params.agentCanvasId,
    versionNumber: 1,
    teamId: "team-1",
    triggeredById: "user-1",
    input: params.input,
    canvas: params.canvas,
  };
}

const activities = {
  executeCanvasNode: (
    input: ExecuteCanvasNodeInput
  ): Promise<ExecuteCanvasNodeOutput> => {
    executedNodes.push(input.node.id);

    if (flakyNodeId && input.node.id === flakyNodeId) {
      const attempt = nodeAttempts.get(input.node.id) ?? 0;
      nodeAttempts.set(input.node.id, attempt + 1);
      if (attempt < failAfterAttempts) {
        const error = new Error("TransientError");
        error.name = "TransientError";
        return Promise.reject(error);
      }
    }

    const now = Date.now();
    if (input.node.type === "condition") {
      return Promise.resolve({
        output: { branchId: "approved", matchedBranchIds: ["approved"] },
        startedAt: now,
        completedAt: now,
        latencyMs: 1,
      });
    }

    return Promise.resolve({
      output: input.input,
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  executeLoopNode: (
    input: ExecuteLoopNodeInput
  ): Promise<ExecuteLoopNodeOutput> => {
    executedNodes.push(input.node.id);
    const now = Date.now();
    const priorIteration = input.loopState?.iteration ?? 0;
    const iteration = input.loopState ? priorIteration + 1 : priorIteration;
    const configMaxIter =
      (input.node.data as { config?: { maxIterations?: number } })?.config
        ?.maxIterations ?? loopMaxIterations;
    const branchId = iteration < configMaxIter ? "body" : "done";

    return Promise.resolve({
      branchId,
      output:
        branchId === "body" ? { value: iteration } : { iterations: iteration },
      loopState: {
        nodeId: input.node.id,
        type: input.loopState?.type ?? "times",
        startedAt: input.loopState?.startedAt ?? now,
        iteration,
        index: iteration,
      },
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  executeParallelSplitNode: (
    input: ExecuteParallelSplitNodeInput
  ): Promise<ExecuteParallelSplitNodeOutput> => {
    executedNodes.push(input.node.id);
    const now = Date.now();
    const config = (
      input.node.data as { config?: { branches?: Array<{ id: string }> } }
    ).config;
    const branches = (config?.branches ?? []).map((branch) => ({
      branchId: branch.id,
      input: input.input,
    }));
    return Promise.resolve({
      output: { branches },
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  executeParallelJoinNode: (
    input: ExecuteParallelJoinNodeInput
  ): Promise<ExecuteParallelJoinNodeOutput> => {
    executedNodes.push(input.node.id);
    const now = Date.now();
    return Promise.resolve({
      output: input.branches.map((branch) => branch.output ?? null),
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  executeParallelMapNode: (
    input: ExecuteParallelMapNodeInput
  ): Promise<ExecuteParallelMapNodeOutput> => {
    executedNodes.push(input.node.id);
    const now = Date.now();
    const items =
      (input.input as { items?: unknown[] } | undefined)?.items ?? [];
    const collectionId = `${input.executionId}-${input.node.id}`;
    parallelMapCollections.set(collectionId, items);
    return Promise.resolve({
      collectionRef: { id: collectionId, storage: "db" },
      collectionSize: items.length,
      inputRef: undefined,
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  resolveParallelMapBatch: (
    input: ResolveParallelMapBatchInput
  ): Promise<ResolveParallelMapBatchOutput> => {
    const collection = parallelMapCollections.get(input.collectionRef.id) ?? [];
    const end = input.limit ? input.offset + input.limit : collection.length;
    return Promise.resolve({
      items: collection.slice(input.offset, end),
    });
  },

  storeParallelMapOutput: (
    input: StoreParallelMapOutputInput
  ): Promise<StoreParallelMapOutputOutput> => {
    const now = Date.now();
    return Promise.resolve({
      output: input.output,
      startedAt: now,
      completedAt: now,
      latencyMs: 1,
    });
  },

  updateCanvasExecution: (input: UpdateCanvasExecutionInput): Promise<void> => {
    executionUpdates.push(input);
    return Promise.resolve();
  },

  createCanvasExecutionStep: (
    input: CreateCanvasExecutionStepInput
  ): Promise<CreateCanvasExecutionStepOutput> => {
    const stepId = `step-${input.node.id}-${Date.now()}`;
    return Promise.resolve({
      stepId,
      inputRef: undefined,
    });
  },

  updateCanvasExecutionStep: (
    input: UpdateCanvasExecutionStepInput
  ): Promise<UpdateCanvasExecutionStepOutput> =>
    Promise.resolve({
      output: input.output,
      outputRef: undefined,
    }),

  createCanvasApproval: (
    input: CreateCanvasApprovalInput
  ): Promise<CreateCanvasApprovalOutput> => {
    const approvalId = `approval-${input.nodeId}-${Date.now()}`;
    approvalRecords.set(approvalId, {
      approvalId,
      nodeId: input.nodeId,
    });
    return Promise.resolve({
      approvalId,
      expiresAt: input.timeoutMs ? Date.now() + input.timeoutMs : undefined,
    });
  },

  logAuditEvent: (input: LogAuditEventInput): Promise<void> => {
    auditEvents.push(input);
    return Promise.resolve();
  },

  prepareSubWorkflowExecution: (
    _input: PrepareSubWorkflowExecutionInput
  ): Promise<PrepareSubWorkflowExecutionOutput> =>
    Promise.resolve({
      executionId: `sub-${Date.now()}`,
      agentCanvasId: "sub-canvas",
      versionNumber: 1,
      canvas: { nodes: [], edges: [] },
      input: {},
      waitForCompletion: true,
    }),

  resolveSubWorkflowOutput: (
    input: ResolveSubWorkflowOutputInput
  ): Promise<ResolveSubWorkflowOutput> =>
    Promise.resolve({
      output: input.output,
    }),
};

describe("Canvas Execution Integration Tests", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let workerRunPromise: Promise<void> | undefined;

  const waitForApprovalRecord = async (timeoutMs = 30_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const approval = Array.from(approvalRecords.values())[0];
      if (approval) {
        return approval;
      }
      await env.sleep(50);
    }
    throw new Error("Expected approval record");
  };

  const waitForExecutionStatus = async (
    handle: WorkflowHandle,
    expectedStatus: string,
    timeoutMs = 30_000
  ) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const state = await handle.query(canvasExecutionQuery);
      if (state.status === expectedStatus) {
        return state;
      }
      await env.sleep(50);
    }
    throw new Error(`Expected status ${expectedStatus}`);
  };

  const queryExecutionStateWithRetry = async (
    handle: WorkflowHandle,
    timeoutMs = 30_000
  ) => {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
      try {
        return await handle.query(canvasExecutionQuery);
      } catch (error) {
        lastError = error;
        await env.sleep(100);
      }
    }

    throw lastError ?? new Error("Failed to query canvas execution state");
  };

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: "test-canvas-integration",
      workflowsPath: fileURLToPath(
        new URL("../workflows/canvas/canvas-execution.ts", import.meta.url)
      ),
      activities,
    });

    workerRunPromise = worker.run();
  }, 180_000);

  afterAll(async () => {
    await worker?.shutdown();
    await workerRunPromise;
    await env?.teardown();
  });

  beforeEach(() => {
    executedNodes.length = 0;
    executionUpdates.length = 0;
    auditEvents.length = 0;
    nodeAttempts.clear();
    parallelMapCollections.clear();
    approvalRecords.clear();
    loopMaxIterations = 3;
    flakyNodeId = null;
    failAfterAttempts = 2;
  });

  describe("Full canvas execution with multiple node types", () => {
    it("executes simple start -> action -> end flow", async () => {
      const result = (await env.client.workflow.execute(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-simple-flow",
          args: [
            createExecutionInput({
              executionId: "exec-simple",
              agentCanvasId: "canvas-simple",
              input: { data: "test" },
              canvas: simpleCanvas,
            }),
          ],
        }
      )) as AgentCanvasExecutionOutput;

      expect(result.status).toBe("COMPLETED");
      expect(result.output).toEqual({ data: "test" });
      expect(executedNodes).toEqual(["start", "action", "end"]);

      const lastUpdate = executionUpdates.at(-1);
      expect(lastUpdate?.status).toBe("COMPLETED");
    });
  });

  describe("Pause/resume signal handling", () => {
    it("pauses and resumes workflow execution", async () => {
      const handle = await env.client.workflow.start(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-pause-resume",
          args: [
            createExecutionInput({
              executionId: "exec-pause",
              agentCanvasId: "canvas-pause",
              input: { data: "pause-test" },
              canvas: simpleCanvas,
            }),
          ],
        }
      );

      await handle.signal(pauseSignal);
      let queryState = await handle.query(canvasExecutionQuery);
      expect(queryState.isPaused).toBe(true);

      await handle.signal(resumeSignal);
      queryState = await handle.query(canvasExecutionQuery);
      expect(queryState.isPaused).toBe(false);

      const result = (await handle.result()) as AgentCanvasExecutionOutput;
      expect(result.status).toBe("COMPLETED");
    });
  });

  describe("Cancel signal handling", () => {
    it("cancels workflow execution on cancel signal", async () => {
      const handle = await env.client.workflow.start(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-cancel",
          args: [
            createExecutionInput({
              executionId: "exec-cancel",
              agentCanvasId: "canvas-cancel",
              input: { data: "cancel-test" },
              canvas: simpleCanvas,
            }),
          ],
        }
      );

      await handle.signal(cancelSignal);

      const result = (await handle.result()) as AgentCanvasExecutionOutput;
      expect(result.status).toBe("CANCELLED");

      const queryState = await handle.query(canvasExecutionQuery);
      expect(queryState.isCancelled).toBe(true);
    });
  });

  describe("Approval node waiting and receiving approval signal", () => {
    it("waits for approval and proceeds on approved signal", async () => {
      const handle = await env.client.workflow.start(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-approval-flow",
          args: [
            createExecutionInput({
              executionId: "exec-approval",
              agentCanvasId: "canvas-approval",
              input: { request: "approval-needed" },
              canvas: approvalCanvas,
            }),
          ],
        }
      );

      const queryState = await waitForExecutionStatus(
        handle,
        "WAITING_APPROVAL"
      );
      expect(queryState.currentNodeId).toBe("approval");

      const approval = await waitForApprovalRecord();

      await handle.signal(canvasApprovalSignal, {
        approvalId: approval.approvalId,
        nodeId: approval.nodeId,
        executionId: "exec-approval",
        status: "APPROVED",
        respondedById: "user-approver",
        responseMessage: "Looks good",
        timestamp: Date.now(),
      });

      const result = (await handle.result()) as AgentCanvasExecutionOutput;
      expect(result.status).toBe("COMPLETED");
      expect(executedNodes).toContain("approved-action");
      expect(executedNodes).not.toContain("rejected-action");
    });

    it("takes rejected path on rejected approval", async () => {
      executedNodes.length = 0;
      approvalRecords.clear();

      const handle = await env.client.workflow.start(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-rejection-flow",
          args: [
            createExecutionInput({
              executionId: "exec-rejection",
              agentCanvasId: "canvas-rejection",
              input: { request: "will-be-rejected" },
              canvas: approvalCanvas,
            }),
          ],
        }
      );

      await waitForExecutionStatus(handle, "WAITING_APPROVAL");
      const approval = await waitForApprovalRecord();

      await handle.signal(canvasApprovalSignal, {
        approvalId: approval.approvalId,
        nodeId: approval.nodeId,
        executionId: "exec-rejection",
        status: "REJECTED",
        respondedById: "user-rejecter",
        responseMessage: "Not approved",
        timestamp: Date.now(),
      });

      const result = (await handle.result()) as AgentCanvasExecutionOutput;
      expect(result.status).toBe("COMPLETED");
      expect(executedNodes).toContain("rejected-action");
      expect(executedNodes).not.toContain("approved-action");
    });
  });

  describe("Loop node iteration limits", () => {
    it("respects maxIterations limit", async () => {
      const result = (await env.client.workflow.execute(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-loop-limit",
          args: [
            createExecutionInput({
              executionId: "exec-loop-limit",
              agentCanvasId: "canvas-loop-limit",
              input: { counter: 0 },
              canvas: loopCanvas,
            }),
          ],
        }
      )) as AgentCanvasExecutionOutput;

      expect(result.status).toBe("COMPLETED");
      expect(result.output).toEqual({ iterations: 3 });

      const loopExecutions = executedNodes.filter((n) => n === "loop");
      const bodyExecutions = executedNodes.filter((n) => n === "body");
      expect(loopExecutions.length).toBe(4);
      expect(bodyExecutions.length).toBe(3);
    });
  });

  describe("Parallel split/join execution", () => {
    it("executes parallel branches and joins results", async () => {
      const result = (await env.client.workflow.execute(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-parallel-split-join",
          args: [
            createExecutionInput({
              executionId: "exec-parallel",
              agentCanvasId: "canvas-parallel",
              input: { data: "parallel-test" },
              canvas: parallelCanvas,
            }),
          ],
        }
      )) as AgentCanvasExecutionOutput;

      expect(result.status).toBe("COMPLETED");
      expect(Array.isArray(result.output)).toBe(true);
      expect((result.output as unknown[]).length).toBe(3);

      expect(executedNodes).toContain("start");
      expect(executedNodes).toContain("split");
      expect(executedNodes).toContain("branch-a");
      expect(executedNodes).toContain("branch-b");
      expect(executedNodes).toContain("branch-c");
      expect(executedNodes).toContain("join");
      expect(executedNodes).toContain("end");
    });
  });

  describe("Error recovery and retry behavior", () => {
    it("retries failed nodes and succeeds after transient failures", async () => {
      flakyNodeId = "flaky";
      failAfterAttempts = 2;

      const result = (await env.client.workflow.execute(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-retry-recovery",
          args: [
            createExecutionInput({
              executionId: "exec-retry",
              agentCanvasId: "canvas-retry",
              input: { data: "retry-test" },
              canvas: retryCanvas,
            }),
          ],
        }
      )) as AgentCanvasExecutionOutput;

      expect(result.status).toBe("COMPLETED");

      const flakyExecutions = executedNodes.filter((n) => n === "flaky");
      expect(flakyExecutions.length).toBe(3);

      const lastUpdate = executionUpdates.at(-1);
      expect(lastUpdate?.status).toBe("COMPLETED");
    });

    it("fails after exhausting retry attempts", async () => {
      flakyNodeId = "flaky";
      failAfterAttempts = 10;

      let error: unknown;
      try {
        await env.client.workflow.execute("agentCanvasExecutionWorkflow", {
          taskQueue: "test-canvas-integration",
          workflowId: "test-retry-exhaust",
          args: [
            createExecutionInput({
              executionId: "exec-retry-exhaust",
              agentCanvasId: "canvas-retry-exhaust",
              input: { data: "will-fail" },
              canvas: retryCanvas,
            }),
          ],
        });
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();

      const lastUpdate = executionUpdates.at(-1);
      expect(lastUpdate?.status).toBe("FAILED");
    });
  });

  describe("Query handler for execution state", () => {
    it("returns accurate execution state via query", async () => {
      const handle = await env.client.workflow.start(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-query-state",
          args: [
            createExecutionInput({
              executionId: "exec-query",
              agentCanvasId: "canvas-query",
              input: { data: "query-test" },
              canvas: simpleCanvas,
            }),
          ],
        }
      );

      const initialQueryState = await queryExecutionStateWithRetry(handle);
      await handle.result();

      let queryState = initialQueryState;
      try {
        queryState = await queryExecutionStateWithRetry(handle, 2000);
      } catch {
        queryState = initialQueryState;
      }
      const lastUpdate = executionUpdates.at(-1);

      expect(queryState.executionId).toBe("exec-query");
      expect(queryState.stepsTotal).toBe(3);
      expect(queryState.isPaused).toBe(false);
      expect(queryState.isCancelled).toBe(false);
      expect(queryState.steps.length).toBeGreaterThan(0);
      expect(lastUpdate?.status).toBe("COMPLETED");
      expect(lastUpdate?.trace?.steps.length).toBe(3);
    });
  });

  describe("continueAsNew triggers on large history", () => {
    it("handles long-running workflows gracefully", async () => {
      loopMaxIterations = 50;

      const result = (await env.client.workflow.execute(
        "agentCanvasExecutionWorkflow",
        {
          taskQueue: "test-canvas-integration",
          workflowId: "test-large-history",
          args: [
            createExecutionInput({
              executionId: "exec-large",
              agentCanvasId: "canvas-large",
              input: { counter: 0 },
              canvas: loopCanvas,
            }),
          ],
        }
      )) as AgentCanvasExecutionOutput;

      expect(result.status).toBe("COMPLETED");
      expect(result.output).toEqual({ iterations: 50 });

      const loopExecutions = executedNodes.filter((n) => n === "loop");
      expect(loopExecutions.length).toBe(51);
    });
  });
});
