import { describe, expect, it, vi } from "vitest";
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

function createMockDb(mockTx: ReturnType<typeof createMockTx>) {
  return {
    $transaction: vi.fn(
      (fn: (tx: ReturnType<typeof createMockTx>) => Promise<unknown>) =>
        fn(mockTx)
    ),
  };
}

describe("deleteCanvasExecutionStep", () => {
  it("deletes step when found with matching team", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue({
      id: "step_1",
    });
    mockTx.agentCanvasExecutionStep.delete.mockResolvedValue({});

    const db = createMockDb(mockTx);
    const activity = createDeleteCanvasExecutionStepActivity({
      db: db as unknown as Parameters<
        typeof createDeleteCanvasExecutionStepActivity
      >[0]["db"],
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

  it("no-ops when step not found", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue(null);

    const db = createMockDb(mockTx);
    const activity = createDeleteCanvasExecutionStepActivity({
      db: db as unknown as Parameters<
        typeof createDeleteCanvasExecutionStepActivity
      >[0]["db"],
    });

    await activity({ stepId: "step_missing", teamId: "team_1" });

    expect(mockTx.agentCanvasExecutionStep.delete).not.toHaveBeenCalled();
  });

  it("no-ops when step belongs to different team", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue(null);

    const db = createMockDb(mockTx);
    const activity = createDeleteCanvasExecutionStepActivity({
      db: db as unknown as Parameters<
        typeof createDeleteCanvasExecutionStepActivity
      >[0]["db"],
    });

    await activity({ stepId: "step_1", teamId: "team_wrong" });

    expect(mockTx.agentCanvasExecutionStep.delete).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const mockTx = createMockTx();
    const db = createMockDb(mockTx);
    const activity = createDeleteCanvasExecutionStepActivity({
      db: db as unknown as Parameters<
        typeof createDeleteCanvasExecutionStepActivity
      >[0]["db"],
    });

    await expect(activity({} as unknown)).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects input missing teamId", async () => {
    const mockTx = createMockTx();
    const db = createMockDb(mockTx);
    const activity = createDeleteCanvasExecutionStepActivity({
      db: db as unknown as Parameters<
        typeof createDeleteCanvasExecutionStepActivity
      >[0]["db"],
    });

    await expect(activity({ stepId: "step_1" } as unknown)).rejects.toThrow();
  });
});

describe("revertCanvasExecutionStatus", () => {
  it("reverts status when execution found with matching team", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue({
      id: "exec_1",
    });
    mockTx.agentCanvasExecution.update.mockResolvedValue({});

    const db = createMockDb(mockTx);
    const activity = createRevertCanvasExecutionStatusActivity({
      db: db as unknown as Parameters<
        typeof createRevertCanvasExecutionStatusActivity
      >[0]["db"],
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      status: "running",
      currentNodeId: "node_5",
    });

    expect(mockTx.agentCanvasExecution.findFirst).toHaveBeenCalledWith({
      where: {
        id: "exec_1",
        agentCanvas: { teamId: "team_1" },
      },
      select: { id: true },
    });
    expect(mockTx.agentCanvasExecution.update).toHaveBeenCalledWith({
      where: { id: "exec_1" },
      data: {
        status: "running",
        currentNodeId: "node_5",
      },
    });
  });

  it("handles nullable currentNodeId", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue({
      id: "exec_1",
    });
    mockTx.agentCanvasExecution.update.mockResolvedValue({});

    const db = createMockDb(mockTx);
    const activity = createRevertCanvasExecutionStatusActivity({
      db: db as unknown as Parameters<
        typeof createRevertCanvasExecutionStatusActivity
      >[0]["db"],
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      status: "completed",
      currentNodeId: null,
    });

    expect(mockTx.agentCanvasExecution.update).toHaveBeenCalledWith({
      where: { id: "exec_1" },
      data: {
        status: "completed",
        currentNodeId: null,
      },
    });
  });

  it("no-ops when execution not found", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecution.findFirst.mockResolvedValue(null);

    const db = createMockDb(mockTx);
    const activity = createRevertCanvasExecutionStatusActivity({
      db: db as unknown as Parameters<
        typeof createRevertCanvasExecutionStatusActivity
      >[0]["db"],
    });

    await activity({
      executionId: "exec_missing",
      teamId: "team_1",
      status: "failed",
    });

    expect(mockTx.agentCanvasExecution.update).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const mockTx = createMockTx();
    const db = createMockDb(mockTx);
    const activity = createRevertCanvasExecutionStatusActivity({
      db: db as unknown as Parameters<
        typeof createRevertCanvasExecutionStatusActivity
      >[0]["db"],
    });

    await expect(
      activity({ executionId: "exec_1" } as unknown)
    ).rejects.toThrow();
  });
});

describe("clearStoredOutput", () => {
  it("deletes data when found with matching team and execution", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionData.findFirst.mockResolvedValue({
      id: "data_1",
    });
    mockTx.agentCanvasExecutionData.delete.mockResolvedValue({});

    const db = createMockDb(mockTx);
    const activity = createClearStoredOutputActivity({
      db: db as unknown as Parameters<
        typeof createClearStoredOutputActivity
      >[0]["db"],
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

  it("no-ops when data not found", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionData.findFirst.mockResolvedValue(null);

    const db = createMockDb(mockTx);
    const activity = createClearStoredOutputActivity({
      db: db as unknown as Parameters<
        typeof createClearStoredOutputActivity
      >[0]["db"],
    });

    await activity({
      executionId: "exec_1",
      teamId: "team_1",
      dataId: "data_missing",
    });

    expect(mockTx.agentCanvasExecutionData.delete).not.toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    const mockTx = createMockTx();
    const db = createMockDb(mockTx);
    const activity = createClearStoredOutputActivity({
      db: db as unknown as Parameters<
        typeof createClearStoredOutputActivity
      >[0]["db"],
    });

    await expect(activity({} as unknown)).rejects.toThrow();
  });
});

describe("createCompensationActivities factory", () => {
  it("creates all three activities", () => {
    const mockTx = createMockTx();
    const db = createMockDb(mockTx);
    const activities = createCompensationActivities({
      db: db as unknown as Parameters<
        typeof createCompensationActivities
      >[0]["db"],
    });

    expect(activities.deleteCanvasExecutionStep).toBeTypeOf("function");
    expect(activities.revertCanvasExecutionStatus).toBeTypeOf("function");
    expect(activities.clearStoredOutput).toBeTypeOf("function");
  });

  it("activities execute within transactions", async () => {
    const mockTx = createMockTx();
    mockTx.agentCanvasExecutionStep.findFirst.mockResolvedValue({
      id: "step_1",
    });
    mockTx.agentCanvasExecutionStep.delete.mockResolvedValue({});

    const db = createMockDb(mockTx);
    const activities = createCompensationActivities({
      db: db as unknown as Parameters<
        typeof createCompensationActivities
      >[0]["db"],
    });

    await activities.deleteCanvasExecutionStep({
      stepId: "step_1",
      teamId: "team_1",
    });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
