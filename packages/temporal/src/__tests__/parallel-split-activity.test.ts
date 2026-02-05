import { beforeAll, describe, expect, it, mock } from "bun:test";
import type { ExecutionPlanNode } from "@openplane/types/canvas";

const executionDataStore = new Map<
  string,
  { payload: unknown; sizeBytes?: number; contentType?: string }
>();
let executionDataCounter = 0;
let stepCounter = 0;

mock.module("@openplane/db", () => ({
  createAgentCanvasExecutionData: mock(
    (
      _db: unknown,
      _teamId: string,
      data: {
        executionId: string;
        nodeId?: string;
        contentType?: string;
        payload: unknown;
        sizeBytes?: number;
      }
    ) => {
      executionDataCounter += 1;
      const id = `data-${executionDataCounter}`;
      executionDataStore.set(id, {
        payload: data.payload,
        sizeBytes: data.sizeBytes,
        contentType: data.contentType,
      });
      return Promise.resolve({
        id,
        sizeBytes: data.sizeBytes,
        contentType: data.contentType,
      });
    }
  ),
  findAgentCanvasExecutionData: mock(
    (_db: unknown, _executionId: string, dataId: string) => {
      const record = executionDataStore.get(dataId);
      if (!record) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        id: dataId,
        payload: record.payload,
        sizeBytes: record.sizeBytes,
        contentType: record.contentType,
      });
    }
  ),
  createAgentCanvasExecutionStep: mock(() => {
    stepCounter += 1;
    return Promise.resolve({ id: `step-${stepCounter}` });
  }),
  updateAgentCanvasExecutionStep: mock(() => Promise.resolve(null)),
}));

let createExecuteParallelSplitNodeActivity: typeof import("../activities/canvas/parallel-split-node").createExecuteParallelSplitNodeActivity;

beforeAll(async () => {
  const mod = await import("../activities/canvas/parallel-split-node");
  createExecuteParallelSplitNodeActivity =
    mod.createExecuteParallelSplitNodeActivity;
});

function buildSplitNode(config: Record<string, unknown>): ExecutionPlanNode {
  return {
    id: "split",
    type: "parallel_split",
    data: { config },
    inbound: ["start"],
    outbound: ["branch-a", "branch-b"],
  };
}

describe("executeParallelSplitNodeActivity", () => {
  it("broadcasts input across branches", async () => {
    const activity = createExecuteParallelSplitNodeActivity({
      db: {} as never,
    });
    const node = buildSplitNode({
      branches: [
        { id: "branch-a", label: "A" },
        { id: "branch-b", label: "B" },
      ],
      dataDistribution: "broadcast",
      executionMode: "parallel",
      maxConcurrency: 2,
      waitForAll: true,
      errorHandling: "failFast",
    });

    const result = await activity({
      executionId: "exec-split-1",
      teamId: "team-1",
      node,
      input: { value: "payload" },
    });

    expect(result.output.branches).toEqual([
      { branchId: "branch-a", input: { value: "payload" } },
      { branchId: "branch-b", input: { value: "payload" } },
    ]);
  });

  it("distributes items round robin", async () => {
    const activity = createExecuteParallelSplitNodeActivity({
      db: {} as never,
    });
    const node = buildSplitNode({
      branches: [
        { id: "branch-a", label: "A" },
        { id: "branch-b", label: "B" },
      ],
      dataDistribution: "roundRobin",
      executionMode: "parallel",
      maxConcurrency: 2,
      waitForAll: true,
      errorHandling: "failFast",
    });

    const result = await activity({
      executionId: "exec-split-2",
      teamId: "team-1",
      node,
      input: [1, 2, 3, 4],
    });

    expect(result.output.branches).toEqual([
      { branchId: "branch-a", input: [1, 3] },
      { branchId: "branch-b", input: [2, 4] },
    ]);
  });
});
