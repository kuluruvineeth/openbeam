import type { ExecutionPlanNode } from "@openplane/types/canvas";
import type { LoopIterationError, LoopState } from "@openplane/types/temporal";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@temporalio/activity", () => ({
  Context: {
    current: () => ({
      heartbeat: vi.fn(),
    }),
  },
}));

const executionDataStore = new Map<
  string,
  { payload: unknown; sizeBytes?: number; contentType?: string }
>();
let executionDataCounter = 0;
let stepCounter = 0;

vi.mock("@openplane/db", () => ({
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

let createExecuteLoopNodeActivity: typeof import("../activities/canvas/loop-node").createExecuteLoopNodeActivity;

beforeAll(async () => {
  const mod = await import("../activities/canvas/loop-node");
  createExecuteLoopNodeActivity = mod.createExecuteLoopNodeActivity;
}, 60_000);

function buildLoopNode(config: Record<string, unknown>): ExecutionPlanNode {
  return {
    id: "loop",
    type: "loop",
    data: { config },
    inbound: ["start"],
    outbound: ["body", "done"],
  };
}

describe("executeLoopNodeActivity", () => {
  it("iterates forEach and aggregates results", async () => {
    const activity = createExecuteLoopNodeActivity({ db: {} as never });
    const node = buildLoopNode({
      type: "forEach",
      collection: "input.items",
      executionMode: "sequential",
      errorHandling: "stop",
      maxIterations: 10,
      outputMode: "all",
    });

    const executionId = "exec-loop-1";
    let loopState: LoopState | undefined;

    let result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: { items: [1, 2, 3] },
      loopState,
    });

    expect(result.branchId).toBe("body");
    expect(result.output).toEqual(1);
    loopState = result.loopState;

    result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: "out-1",
      loopState,
    });

    expect(result.branchId).toBe("body");
    expect(result.output).toEqual(2);
    loopState = result.loopState;

    result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: "out-2",
      loopState,
    });

    expect(result.branchId).toBe("body");
    expect(result.output).toEqual(3);
    loopState = result.loopState;

    result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: "out-3",
      loopState,
    });

    expect(result.branchId).toBe("done");
    expect(result.output).toEqual(["out-1", "out-2", "out-3"]);
  });

  it("collects errors when configured", async () => {
    const activity = createExecuteLoopNodeActivity({ db: {} as never });
    const node = buildLoopNode({
      type: "times",
      times: 2,
      executionMode: "sequential",
      errorHandling: "collect",
      maxIterations: 5,
      outputMode: "all",
    });

    const executionId = "exec-loop-2";
    let loopState: LoopState | undefined;

    let result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: { seed: "start" },
      loopState,
    });

    loopState = result.loopState;

    const iterationError: LoopIterationError = {
      message: "boom",
      nodeId: "body",
      nodeType: "transform",
      iteration: 0,
      occurredAt: Date.now(),
    };

    result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: { seed: "start" },
      loopState,
      iterationError,
    });

    loopState = result.loopState;

    result = await activity({
      executionId,
      teamId: "team-1",
      node,
      input: "ok",
      loopState,
    });

    expect(result.branchId).toBe("done");
    expect(result.output).toEqual({
      result: ["ok"],
      errors: [
        {
          message: "boom",
          nodeId: "body",
          nodeType: "transform",
          iteration: 0,
          index: 0,
          occurredAt: iterationError.occurredAt,
        },
      ],
    });
  });
});
