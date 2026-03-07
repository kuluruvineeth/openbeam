import type { ExecutionPlanNode } from "@openbeam/types/canvas";
import { beforeAll, describe, expect, it, vi } from "vitest";

const executionDataStore = new Map<
  string,
  { payload: unknown; sizeBytes?: number; contentType?: string }
>();
let executionDataCounter = 0;
let stepCounter = 0;

vi.mock("@openbeam/db", () => ({
  createAgentCanvasExecutionData: vi.fn(
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
  findAgentCanvasExecutionData: vi.fn(
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
  createAgentCanvasExecutionStep: vi.fn(() => {
    stepCounter += 1;
    return Promise.resolve({ id: `step-${stepCounter}` });
  }),
  updateAgentCanvasExecutionStep: vi.fn(() => Promise.resolve(null)),
}));

let createExecuteParallelJoinNodeActivity: typeof import("../activities/canvas/parallel-join-node").createExecuteParallelJoinNodeActivity;

beforeAll(async () => {
  const mod = await import("../activities/canvas/parallel-join-node");
  createExecuteParallelJoinNodeActivity =
    mod.createExecuteParallelJoinNodeActivity;
});

function buildJoinNode(config: Record<string, unknown>): ExecutionPlanNode {
  return {
    id: "join",
    type: "parallel_join",
    data: { config },
    inbound: ["branch-a", "branch-b"],
    outbound: ["out"],
  };
}

describe("executeParallelJoinNodeActivity", () => {
  it("appends branch outputs", async () => {
    const activity = createExecuteParallelJoinNodeActivity({ db: {} as never });
    const node = buildJoinNode({
      inputs: [
        { id: "input-1", label: "A" },
        { id: "input-2", label: "B" },
      ],
      joinMode: "waitForAll",
      mergeStrategy: "append",
      emptyBranchHandling: "includeEmpty",
      errorHandling: "failFast",
    });

    const result = await activity({
      executionId: "exec-join-1",
      teamId: "team-1",
      node,
      branches: [
        { branchId: "input-1", output: [1, 2] },
        { branchId: "input-2", output: [3] },
      ],
    });

    expect(result.output).toEqual([1, 2, 3]);
  });

  it("collects branch errors when configured", async () => {
    const activity = createExecuteParallelJoinNodeActivity({ db: {} as never });
    const node = buildJoinNode({
      inputs: [
        { id: "input-1", label: "A" },
        { id: "input-2", label: "B" },
      ],
      joinMode: "waitForAll",
      mergeStrategy: "keepFirst",
      emptyBranchHandling: "includeEmpty",
      errorHandling: "collectErrors",
    });

    const result = await activity({
      executionId: "exec-join-2",
      teamId: "team-1",
      node,
      branches: [
        { branchId: "input-1", output: "ok" },
        { branchId: "input-2", error: "boom" },
      ],
    });

    expect(result.output).toEqual({
      result: "ok",
      errors: [{ branchId: "input-2", error: "boom" }],
    });
  });
});
