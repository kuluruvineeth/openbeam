import type {
  CanvasNodeType,
  ExecutionContext,
  ExecutionPlanNode,
} from "@openplane/types/canvas";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

const {
  executeCanvasNodeServiceMock,
  MockCanvasNodeExecutorNotFoundError,
  MockCanvasNodeExecutionError,
} = vi.hoisted(() => {
  class ExecutorNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CanvasNodeExecutorNotFoundError";
    }
  }

  class ExecutionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CanvasNodeExecutionError";
    }
  }

  return {
    executeCanvasNodeServiceMock: vi.fn(),
    MockCanvasNodeExecutorNotFoundError: ExecutorNotFoundError,
    MockCanvasNodeExecutionError: ExecutionError,
  };
});

vi.mock("@openplane/services/canvas", () => ({
  executeCanvasNode: executeCanvasNodeServiceMock,
  CanvasNodeExecutorNotFoundError: MockCanvasNodeExecutorNotFoundError,
  CanvasNodeExecutionError: MockCanvasNodeExecutionError,
}));

let createExecuteCanvasNodeActivity: typeof import("../activities/canvas/execute-node").createExecuteCanvasNodeActivity;

beforeAll(async () => {
  const mod = await import("../activities/canvas/execute-node");
  createExecuteCanvasNodeActivity = mod.createExecuteCanvasNodeActivity;
});

beforeEach(() => {
  executionDataStore.clear();
  executionDataCounter = 0;
  stepCounter = 0;
  executeCanvasNodeServiceMock.mockClear();
  executeCanvasNodeServiceMock.mockResolvedValue({ result: "success" });
});

function buildNode(
  type: CanvasNodeType,
  config: Record<string, unknown> = {}
): ExecutionPlanNode {
  return {
    id: `node-${type}`,
    type,
    data: { config },
    inbound: ["input"],
    outbound: ["output"],
  };
}

function buildContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext {
  return {
    executionId: "exec-test",
    agentCanvasId: "canvas-1",
    versionNumber: 1,
    teamId: "team-1",
    triggeredById: "user-1",
    ...overrides,
  };
}

describe("createExecuteCanvasNodeActivity", () => {
  it("executes node successfully and returns output", async () => {
    executeCanvasNodeServiceMock.mockResolvedValue({
      processed: true,
      count: 5,
    });
    const activity = createExecuteCanvasNodeActivity({ db: {} as never });

    const result = await activity({
      executionId: "exec-1",
      teamId: "team-1",
      node: buildNode("template"),
      input: { data: [1, 2, 3] },
      context: buildContext(),
    });

    expect(result.output).toEqual({ processed: true, count: 5 });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.startedAt).toBeLessThanOrEqual(result.completedAt);
  });

  it("passes correct parameters to service", async () => {
    const activity = createExecuteCanvasNodeActivity({ db: {} as never });
    const node = buildNode("llm", { model: "gpt-4" });
    const inputData = { prompt: "Hello" };
    const context = buildContext({ teamId: "team-2", triggeredById: "user-2" });

    await activity({
      executionId: "exec-2",
      teamId: "team-2",
      node,
      input: inputData,
      context,
    });

    expect(executeCanvasNodeServiceMock).toHaveBeenCalledTimes(1);
    expect(executeCanvasNodeServiceMock).toHaveBeenCalledWith({
      node,
      input: inputData,
      context,
    });
  });

  it("stores large outputs as execution data refs", async () => {
    const largeOutput = { data: "x".repeat(10_000) };
    executeCanvasNodeServiceMock.mockResolvedValue(largeOutput);

    const activity = createExecuteCanvasNodeActivity({
      db: {} as never,
      maxInlineBytes: 1000,
    });

    const result = await activity({
      executionId: "exec-3",
      teamId: "team-1",
      node: buildNode("template"),
      input: { small: "input" },
      context: buildContext(),
    });

    expect(result.outputRef).toBeDefined();
    expect(result.output).toBeUndefined();
  });

  it("handles small outputs inline", async () => {
    const smallOutput = { status: "ok" };
    executeCanvasNodeServiceMock.mockResolvedValue(smallOutput);

    const activity = createExecuteCanvasNodeActivity({
      db: {} as never,
      maxInlineBytes: 10_000,
    });

    const result = await activity({
      executionId: "exec-4",
      teamId: "team-1",
      node: buildNode("template"),
      input: {},
      context: buildContext(),
    });

    expect(result.output).toEqual(smallOutput);
    expect(result.outputRef).toBeUndefined();
  });

  it("wraps executor not found errors as non-retryable", async () => {
    const notFoundError = new MockCanvasNodeExecutorNotFoundError(
      "No executor for node type: code"
    );
    executeCanvasNodeServiceMock.mockRejectedValue(notFoundError);

    const activity = createExecuteCanvasNodeActivity({ db: {} as never });

    await expect(
      activity({
        executionId: "exec-5",
        teamId: "team-1",
        node: buildNode("code"),
        input: {},
        context: buildContext(),
      })
    ).rejects.toThrow("No executor for node type: code");
  });

  it("wraps execution errors as non-retryable", async () => {
    const execError = new MockCanvasNodeExecutionError(
      "Failed to execute template"
    );
    executeCanvasNodeServiceMock.mockRejectedValue(execError);

    const activity = createExecuteCanvasNodeActivity({ db: {} as never });

    await expect(
      activity({
        executionId: "exec-6",
        teamId: "team-1",
        node: buildNode("template"),
        input: {},
        context: buildContext(),
      })
    ).rejects.toThrow("Failed to execute template");
  });

  it("re-throws unknown errors unchanged", async () => {
    const unknownError = new Error("Network failure");
    executeCanvasNodeServiceMock.mockRejectedValue(unknownError);

    const activity = createExecuteCanvasNodeActivity({ db: {} as never });

    await expect(
      activity({
        executionId: "exec-7",
        teamId: "team-1",
        node: buildNode("http_request"),
        input: {},
        context: buildContext(),
      })
    ).rejects.toThrow("Network failure");
  });

  it("returns timing information", async () => {
    const activity = createExecuteCanvasNodeActivity({ db: {} as never });
    const beforeExec = Date.now();

    const result = await activity({
      executionId: "exec-8",
      teamId: "team-1",
      node: buildNode("template"),
      input: {},
      context: buildContext(),
    });

    const afterExec = Date.now();

    expect(result.startedAt).toBeGreaterThanOrEqual(beforeExec);
    expect(result.completedAt).toBeLessThanOrEqual(afterExec);
    expect(result.latencyMs).toBe(result.completedAt - result.startedAt);
  });
});
