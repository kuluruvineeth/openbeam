import { beforeEach, describe, expect, it, vi } from "vitest";

let createCleanupExecutionDataActivity: typeof import("../activities/canvas/cleanup").createCleanupExecutionDataActivity;

const mockDb = {
  agentCanvasExecution: {
    findMany: vi.fn(),
  },
  agentCanvasExecutionData: {
    deleteMany: vi.fn(),
  },
} as never;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("../activities/canvas/cleanup");
  createCleanupExecutionDataActivity = mod.createCleanupExecutionDataActivity;
});

describe("cleanupExecutionData", () => {
  it("deletes payloads for old completed executions", async () => {
    (mockDb as any).agentCanvasExecution.findMany.mockResolvedValue([
      { id: "exec-1" },
      { id: "exec-2" },
    ]);
    (mockDb as any).agentCanvasExecutionData.deleteMany.mockResolvedValue({
      count: 15,
    });

    const activity = createCleanupExecutionDataActivity({ db: mockDb });
    const result = await activity({ olderThanDays: 30 });

    expect(result.deletedPayloads).toBe(15);
    expect(result.processedExecutions).toBe(2);

    expect((mockDb as any).agentCanvasExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"] },
          createdAt: { lt: expect.any(Date) },
        }),
        take: 1000,
      })
    );
  });

  it("returns zeros when no executions found", async () => {
    (mockDb as any).agentCanvasExecution.findMany.mockResolvedValue([]);

    const activity = createCleanupExecutionDataActivity({ db: mockDb });
    const result = await activity({ olderThanDays: 30 });

    expect(result.deletedPayloads).toBe(0);
    expect(result.processedExecutions).toBe(0);
    expect(
      (mockDb as any).agentCanvasExecutionData.deleteMany
    ).not.toHaveBeenCalled();
  });

  it("scopes cleanup to team when teamId provided", async () => {
    (mockDb as any).agentCanvasExecution.findMany.mockResolvedValue([
      { id: "exec-1" },
    ]);
    (mockDb as any).agentCanvasExecutionData.deleteMany.mockResolvedValue({
      count: 3,
    });

    const activity = createCleanupExecutionDataActivity({ db: mockDb });
    await activity({ olderThanDays: 30, teamId: "team-1" });

    expect((mockDb as any).agentCanvasExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentCanvas: { teamId: "team-1" },
        }),
      })
    );
  });

  it("rejects olderThanDays less than 1", async () => {
    const activity = createCleanupExecutionDataActivity({ db: mockDb });

    await expect(activity({ olderThanDays: 0 })).rejects.toThrow(
      "olderThanDays must be at least 1"
    );
  });

  it("deletes payloads by execution IDs in batch", async () => {
    const executions = Array.from({ length: 5 }, (_, i) => ({
      id: `exec-${i}`,
    }));
    (mockDb as any).agentCanvasExecution.findMany.mockResolvedValue(executions);
    (mockDb as any).agentCanvasExecutionData.deleteMany.mockResolvedValue({
      count: 50,
    });

    const activity = createCleanupExecutionDataActivity({ db: mockDb });
    const result = await activity({ olderThanDays: 7 });

    expect(result.processedExecutions).toBe(5);
    expect(
      (mockDb as any).agentCanvasExecutionData.deleteMany
    ).toHaveBeenCalledWith({
      where: {
        executionId: {
          in: ["exec-0", "exec-1", "exec-2", "exec-3", "exec-4"],
        },
      },
    });
  });
});
