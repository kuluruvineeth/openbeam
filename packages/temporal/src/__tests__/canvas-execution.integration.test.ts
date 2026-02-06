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

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue: "test-canvas-integration",
      workflowsPath: require.resolve("../workflows/canvas/canvas-execution"),
      activities,
    });

    worker.run();
  });

  afterAll(async () => {
    worker?.shutdown();
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
            {
              executionId: "exec-simple",
              agentCanvasId: "canvas-simple",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "test" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-pause",
              agentCanvasId: "canvas-pause",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "pause-test" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-cancel",
              agentCanvasId: "canvas-cancel",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "cancel-test" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-approval",
              agentCanvasId: "canvas-approval",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { request: "approval-needed" },
            } as AgentCanvasExecutionInput,
          ],
        }
      );

      await env.sleep(100);

      const queryState = await handle.query(canvasExecutionQuery);
      expect(queryState.status).toBe("WAITING_APPROVAL");

      const approval = Array.from(approvalRecords.values())[0];
      expect(approval?.approvalId).toBeDefined();

      if (!approval) {
        throw new Error("Expected approval record");
      }

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
            {
              executionId: "exec-rejection",
              agentCanvasId: "canvas-rejection",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { request: "will-be-rejected" },
            } as AgentCanvasExecutionInput,
          ],
        }
      );

      await env.sleep(100);

      const approval = Array.from(approvalRecords.values())[0];

      if (!approval) {
        throw new Error("Expected approval record");
      }

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
            {
              executionId: "exec-loop-limit",
              agentCanvasId: "canvas-loop-limit",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { counter: 0 },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-parallel",
              agentCanvasId: "canvas-parallel",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "parallel-test" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-retry",
              agentCanvasId: "canvas-retry",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "retry-test" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-retry-exhaust",
              agentCanvasId: "canvas-retry-exhaust",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "will-fail" },
            } as AgentCanvasExecutionInput,
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
            {
              executionId: "exec-query",
              agentCanvasId: "canvas-query",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { data: "query-test" },
            } as AgentCanvasExecutionInput,
          ],
        }
      );

      await handle.result();

      const queryState = await handle.query(canvasExecutionQuery);

      expect(queryState.executionId).toBe("exec-query");
      expect(queryState.status).toBe("COMPLETED");
      expect(queryState.stepsCompleted).toBe(3);
      expect(queryState.stepsTotal).toBe(3);
      expect(queryState.isPaused).toBe(false);
      expect(queryState.isCancelled).toBe(false);
      expect(queryState.steps).toHaveLength(3);
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
            {
              executionId: "exec-large",
              agentCanvasId: "canvas-large",
              versionNumber: 1,
              teamId: "team-1",
              triggeredById: "user-1",
              input: { counter: 0 },
            } as AgentCanvasExecutionInput,
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
