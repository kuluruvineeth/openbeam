import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createClearStoredOutputActivity,
  createCompensationActivities,
  createDeleteCanvasExecutionStepActivity,
  createRevertCanvasExecutionStatusActivity,
} from "../activities/canvas/compensation";

function createMockTx() {
  return {
    agentCanvasExecutionStep: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    agentCanvasExecution: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    agentCanvasExecutionData: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  };
}

function createMockDb(mockTxInstance: ReturnType<typeof createMockTx>) {
  return {
    $transaction: vi.fn(
      (fn: (t: ReturnType<typeof createMockTx>) => Promise<void>) =>
        fn(mockTxInstance)
    ),
  };
}

describe("createDeleteCanvasExecutionStepActivity", () => {
  let mockTx: ReturnType<typeof createMockTx>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockTx = createMockTx();
    mockDb = createMockDb(mockTx);
  });

  it("deletes step when found", async () => {
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue({
      id: "step_1",
    });

    const activity = createDeleteCanvasExecutionStepActivity({
      db: mockDb as never,
    });

    await activity({ stepId: "step_1", teamId: "team_1" });

    expect(mockTx.agentCanvasExecutionStep.findFirst).toHaveBeenCalledWith({
      where: {
        id: "step_1",
        execution: { agentCanvas: { teamId: "team_1" } },
      },
      select: { id: true },
    });
    expect(mockTx.agentCanvasExecutionStep.delete).toHaveBeenCalledWith({
      where: { id: "step_1" },
    });
  });

  it("does nothing when step not found", async () => {
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue(null);

    const activity = createDeleteCanvasExecutionStepActivity({
      db: mockDb as never,
    });

    await activity({ stepId: "step_missing", teamId: "team_1" });

    expect(mockTx.agentCanvasExecutionStep.delete).not.toHaveBeenCalled();
  });

  it("validates input with Zod", async () => {
    const activity = createDeleteCanvasExecutionStepActivity({
      db: mockDb as never,
    });

    await expect(activity({} as never)).rejects.toThrow();
  });
});

describe("createRevertCanvasExecutionStatusActivity", () => {
  let mockTx: ReturnType<typeof createMockTx>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockTx = createMockTx();
    mockDb = createMockDb(mockTx);
  });

  it("reverts status when execution found", async () => {
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue({ id: "exec_1" });

    const activity = createRevertCanvasExecutionStatusActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      status: "RUNNING",
      currentNodeId: "node_5",
    });

    expect(mockTx.agentCanvasExecution.update).toHaveBeenCalledWith({
      where: { id: "exec_1" },
      data: { status: "RUNNING", currentNodeId: "node_5" },
    });
  });

  it("does nothing when execution not found", async () => {
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue(null);

    const activity = createRevertCanvasExecutionStatusActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_missing",
      teamId: "team_1",
      status: "FAILED",
    });

    expect(mockTx.agentCanvasExecution.update).not.toHaveBeenCalled();
  });

  it("handles null currentNodeId", async () => {
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue({ id: "exec_1" });

    const activity = createRevertCanvasExecutionStatusActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      status: "COMPLETED",
      currentNodeId: null,
    });

    expect(mockTx.agentCanvasExecution.update).toHaveBeenCalledWith({
      where: { id: "exec_1" },
      data: { status: "COMPLETED", currentNodeId: null },
    });
  });

  it("validates input with Zod", async () => {
    const activity = createRevertCanvasExecutionStatusActivity({
      db: mockDb as never,
    });

    await expect(activity({ executionId: 123 } as never)).rejects.toThrow();
  });
});

describe("createClearStoredOutputActivity", () => {
  let mockTx: ReturnType<typeof createMockTx>;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockTx = createMockTx();
    mockDb = createMockDb(mockTx);
  });

  it("deletes stored output when found", async () => {
    mockTx.agentCanvasExecutionData.findFirst.mockResolvedValue({
      id: "data_1",
    });

    const activity = createClearStoredOutputActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      dataId: "data_1",
    });

    expect(mockTx.agentCanvasExecutionData.findFirst).toHaveBeenCalledWith({
      where: {
        id: "data_1",
        executionId: "exec_1",
        execution: { agentCanvas: { teamId: "team_1" } },
      },
      select: { id: true },
    });
    expect(mockTx.agentCanvasExecutionData.delete).toHaveBeenCalledWith({
      where: { id: "data_1" },
    });
  });

  it("does nothing when data not found", async () => {
    mockTx.agentCanvasExecutionData.findFirst.mockResolvedValue(null);

    const activity = createClearStoredOutputActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      dataId: "data_missing",
    });

    expect(mockTx.agentCanvasExecutionData.delete).not.toHaveBeenCalled();
  });

  it("scopes query to team", async () => {
    mockTx.agentCanvasExecutionData.findFirst.mockResolvedValue(null);

    const activity = createClearStoredOutputActivity({
      db: mockDb as never,
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_other",
      dataId: "data_1",
    });

    const call = mockTx.agentCanvasExecutionData.findFirst.mock.calls[0] ?? [];
    const where = (call[0] as Record<string, unknown>).where as Record<
      string,
      unknown
    >;
    expect(where.execution).toEqual({
      agentCanvas: { teamId: "team_other" },
    });
  });
});

describe("createCompensationActivities", () => {
  it("returns all three activities", () => {
    const mockDb = createMockDb(createMockTx());
    const activities = createCompensationActivities({
      db: mockDb as never,
    });

    expect(activities.deleteCanvasExecutionStep).toBeTypeOf("function");
    expect(activities.revertCanvasExecutionStatus).toBeTypeOf("function");
    expect(activities.clearStoredOutput).toBeTypeOf("function");
  });
});
