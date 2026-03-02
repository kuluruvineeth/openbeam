import { fileURLToPath } from "node:url";
import type {
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
  ResolveParallelMapBatchInput,
  ResolveParallelMapBatchOutput,
  StoreParallelMapOutputInput,
  StoreParallelMapOutputOutput,
  UpdateCanvasExecutionInput,
} from "@openplane/types/temporal";
import { ApplicationFailure } from "@temporalio/common";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { agentCanvasExecutionWorkflow } from "../workflows/canvas/canvas-execution";

const executedNodes: string[] = [];
const executionUpdates: UpdateCanvasExecutionInput[] = [];
const nodeAttempts = new Map<string, number>();
const parallelMapCollections = new Map<string, unknown[]>();

const linearCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "transform",
      type: "transform",
      position: { x: 120, y: 0 },
      data: {},
    },
    {
      id: "filter",
      type: "filter",
      position: { x: 240, y: 0 },
      data: {},
    },
    {
      id: "template",
      type: "template",
      position: { x: 360, y: 0 },
      data: {},
    },
    {
      id: "code",
      type: "code",
      position: { x: 480, y: 0 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 600, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "transform" },
    { id: "e2", source: "transform", target: "filter" },
    { id: "e3", source: "filter", target: "template" },
    { id: "e4", source: "template", target: "code" },
    { id: "e5", source: "code", target: "end" },
  ],
};

const nonLinearCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "branch-a",
      type: "transform",
      position: { x: 120, y: -40 },
      data: {},
    },
    {
      id: "branch-b",
      type: "transform",
      position: { x: 120, y: 40 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 240, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "branch-a" },
    { id: "e2", source: "start", target: "branch-b" },
    { id: "e3", source: "branch-a", target: "end" },
    { id: "e4", source: "branch-b", target: "end" },
  ],
};

const branchingCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "condition",
      type: "condition",
      position: { x: 120, y: 0 },
      data: {
        config: {
          mode: "visual",
          evaluationOrder: "sequential",
          branches: [
            {
              id: "approved",
              label: "Approved",
              groups: [],
            },
            {
              id: "rejected",
              label: "Rejected",
              groups: [],
            },
          ],
          defaultBranchLabel: "",
        },
      },
    },
    {
      id: "approved",
      type: "transform",
      position: { x: 240, y: -40 },
      data: {},
    },
    {
      id: "rejected",
      type: "transform",
      position: { x: 240, y: 40 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 360, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "condition" },
    {
      id: "e2",
      source: "condition",
      target: "approved",
      sourceHandle: "approved",
    },
    {
      id: "e3",
      source: "condition",
      target: "rejected",
      sourceHandle: "rejected",
    },
    { id: "e4", source: "approved", target: "end" },
    { id: "e5", source: "rejected", target: "end" },
  ],
};

const loopCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
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
          maxIterations: 10,
          outputMode: "all",
        },
      },
    },
    {
      id: "body",
      type: "transform",
      position: { x: 240, y: 0 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 360, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "loop" },
    { id: "e2", source: "loop", target: "body", sourceHandle: "body" },
    { id: "e3", source: "body", target: "loop" },
    { id: "e4", source: "loop", target: "end", sourceHandle: "done" },
  ],
};

const parallelCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "split",
      type: "parallel_split",
      position: { x: 120, y: 0 },
      data: {
        config: {
          branches: [
            { id: "branch-a", label: "A" },
            { id: "branch-b", label: "B" },
          ],
          dataDistribution: "broadcast",
          executionMode: "parallel",
          maxConcurrency: 2,
          waitForAll: true,
          errorHandling: "failFast",
        },
      },
    },
    {
      id: "branch-a",
      type: "transform",
      position: { x: 240, y: -40 },
      data: {},
    },
    {
      id: "branch-b",
      type: "transform",
      position: { x: 240, y: 40 },
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
          ],
          joinMode: "waitForAll",
          mergeStrategy: "append",
          emptyBranchHandling: "includeEmpty",
          errorHandling: "failFast",
        },
      },
    },
    {
      id: "end",
      type: "end",
      position: { x: 480, y: 0 },
      data: {},
    },
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
      source: "branch-a",
      target: "join",
      targetHandle: "input-1",
    },
    {
      id: "p5",
      source: "branch-b",
      target: "join",
      targetHandle: "input-2",
    },
    { id: "p6", source: "join", target: "end" },
  ],
};

const retryCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "retry",
      type: "retry",
      position: { x: 120, y: 0 },
      data: {
        config: {
          maxAttempts: 2,
          backoffMs: 100,
          exponential: false,
        },
      },
    },
    {
      id: "unstable",
      type: "transform",
      position: { x: 240, y: 0 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 360, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "retry" },
    { id: "e2", source: "retry", target: "unstable" },
    { id: "e3", source: "unstable", target: "end" },
  ],
};

const tryCatchCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "try-catch",
      type: "try_catch",
      position: { x: 120, y: 0 },
      data: {
        config: {
          catchErrors: ["PermanentError"],
          rethrowUnhandled: true,
          logErrors: true,
        },
      },
    },
    {
      id: "always-fail",
      type: "transform",
      position: { x: 240, y: -40 },
      data: {},
    },
    {
      id: "handler",
      type: "transform",
      position: { x: 240, y: 40 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 360, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "try-catch" },
    {
      id: "e2",
      source: "try-catch",
      target: "always-fail",
      sourceHandle: "try",
    },
    {
      id: "e3",
      source: "try-catch",
      target: "handler",
      sourceHandle: "catch",
    },
    { id: "e4", source: "always-fail", target: "end" },
    { id: "e5", source: "handler", target: "end" },
  ],
};

const parallelMapCanvas = {
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: {},
    },
    {
      id: "parallel-map",
      type: "parallel_map",
      position: { x: 120, y: 0 },
      data: {
        config: {
          collection: "input.items",
          itemVariable: "item",
          indexVariable: "index",
          maxConcurrency: 2,
          continueOnError: false,
          aggregationMode: "array",
          progressTracking: false,
        },
      },
    },
    {
      id: "map-target",
      type: "transform",
      position: { x: 240, y: 0 },
      data: {},
    },
    {
      id: "end",
      type: "end",
      position: { x: 360, y: 0 },
      data: {},
    },
  ],
  edges: [
    { id: "e1", source: "start", target: "parallel-map" },
    { id: "e2", source: "parallel-map", target: "map-target" },
    { id: "e3", source: "map-target", target: "end" },
  ],
};

describe("agentCanvasExecutionWorkflow", () => {
  let env: TestWorkflowEnvironment;
  let worker: Worker;
  let workerRunPromise: Promise<void> | undefined;

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping();

    const activities = {
      executeCanvasNode: (
        input: ExecuteCanvasNodeInput
      ): Promise<ExecuteCanvasNodeOutput> => {
        executedNodes.push(input.node.id);
        if (input.node.id === "always-fail") {
          return Promise.reject(
            ApplicationFailure.nonRetryable("PermanentError", "PermanentError")
          );
        }
        if (input.node.id === "unstable") {
          const attempt = nodeAttempts.get(input.node.id) ?? 0;
          nodeAttempts.set(input.node.id, attempt + 1);
          if (attempt === 0) {
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
        const branchId = iteration < 3 ? "body" : "done";
        return Promise.resolve({
          branchId,
          output:
            branchId === "body"
              ? { value: iteration }
              : { iterations: iteration },
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
        const collection =
          parallelMapCollections.get(input.collectionRef.id) ?? [];
        const end = input.limit
          ? input.offset + input.limit
          : collection.length;
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
      updateCanvasExecution: (
        input: UpdateCanvasExecutionInput
      ): Promise<void> => {
        executionUpdates.push(input);
        return Promise.resolve();
      },
    };

    worker = await Worker.create({
      connection: env.nativeConnection,
      namespace: env.namespace,
      taskQueue: "test-canvas",
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
    nodeAttempts.clear();
    parallelMapCollections.clear();
  });

  it("executes a linear canvas", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-linear",
        args: [
          {
            executionId: "exec-linear",
            agentCanvasId: "canvas-1",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: linearCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(result.output).toEqual({ message: "hello" });
    expect(executedNodes).toEqual([
      "start",
      "transform",
      "filter",
      "template",
      "code",
      "end",
    ]);

    const lastUpdate = executionUpdates.at(-1);
    expect(lastUpdate?.status).toBe("COMPLETED");
    expect(lastUpdate?.trace?.steps.length).toBe(6);
  });

  it("fails on non-linear canvas", async () => {
    let error: unknown;

    try {
      await env.client.workflow.execute(agentCanvasExecutionWorkflow, {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-non-linear",
        args: [
          {
            executionId: "exec-non-linear",
            agentCanvasId: "canvas-2",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: nonLinearCanvas,
          },
        ],
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();

    const lastUpdate = executionUpdates.at(-1);
    expect(lastUpdate?.status).toBe("FAILED");
  });

  it("executes condition branches", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-condition",
        args: [
          {
            executionId: "exec-condition",
            agentCanvasId: "canvas-3",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: branchingCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(executedNodes).toEqual(["start", "condition", "approved", "end"]);
  });

  it("executes loop nodes", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-loop",
        args: [
          {
            executionId: "exec-loop",
            agentCanvasId: "canvas-4",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: loopCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(result.output).toEqual({ iterations: 3 });
    expect(executedNodes).toEqual([
      "start",
      "loop",
      "body",
      "loop",
      "body",
      "loop",
      "body",
      "loop",
      "end",
    ]);
  });

  it("executes try/catch nodes", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-try-catch",
        args: [
          {
            executionId: "exec-try-catch",
            agentCanvasId: "canvas-6",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: tryCatchCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(executedNodes).toContain("always-fail");
    expect(executedNodes).toContain("handler");
    expect(executedNodes.at(-1)).toBe("end");

    const lastUpdate = executionUpdates.at(-1);
    const steps = lastUpdate?.trace?.steps ?? [];
    const failedTrySteps = steps.filter(
      (step) => step.nodeId === "always-fail" && step.status === "FAILED"
    );
    const handlerSteps = steps.filter(
      (step) => step.nodeId === "handler" && step.status === "COMPLETED"
    );

    expect(failedTrySteps.length).toBeGreaterThan(0);
    expect(handlerSteps.length).toBe(1);
  });

  it("executes parallel map nodes", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-parallel-map",
        args: [
          {
            executionId: "exec-parallel-map",
            agentCanvasId: "canvas-8",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { items: ["a", "b", "c"] },
            canvas: parallelMapCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(Array.isArray(result.output)).toBe(true);
    expect(result.output).toHaveLength(3);
    expect(executedNodes.filter((node) => node === "map-target")).toHaveLength(
      3
    );
    expect(executedNodes.at(-1)).toBe("end");
  });

  it("retries failed nodes", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-retry",
        args: [
          {
            executionId: "exec-retry",
            agentCanvasId: "canvas-7",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: retryCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(result.output).toEqual({ message: "hello" });
    expect(executedNodes).toEqual(["start", "unstable", "unstable", "end"]);

    const lastUpdate = executionUpdates.at(-1);
    const steps = lastUpdate?.trace?.steps ?? [];
    const retrySteps = steps.filter((step) => step.nodeId === "retry");
    const unstableSteps = steps.filter((step) => step.nodeId === "unstable");

    expect(retrySteps.length).toBe(1);
    expect(unstableSteps.length).toBe(2);
    expect(unstableSteps[0]?.status).toBe("FAILED");
    expect(unstableSteps[1]?.status).toBe("COMPLETED");
  });

  it("executes parallel split and join nodes", async () => {
    const result = await env.client.workflow.execute(
      agentCanvasExecutionWorkflow,
      {
        taskQueue: "test-canvas",
        workflowId: "test-canvas-parallel",
        args: [
          {
            executionId: "exec-parallel",
            agentCanvasId: "canvas-5",
            versionNumber: 1,
            teamId: "team-1",
            triggeredById: "user-1",
            input: { message: "hello" },
            canvas: parallelCanvas,
          },
        ],
      }
    );

    expect(result.status).toBe("COMPLETED");
    expect(result.output).toEqual([{ message: "hello" }, { message: "hello" }]);
    expect([...executedNodes].sort()).toEqual(
      ["start", "split", "branch-a", "branch-b", "join", "end"].sort()
    );
  });
});
