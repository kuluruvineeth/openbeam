import { beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_QUEUES } from "../config/task-queues";

const mockCreateClientConnection = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockDescribe = vi.fn();
const mockGetHandle = vi.fn();
const mockConnectionClose = vi.fn();
const mockScheduleClientConstructor = vi.fn();

class MockScheduleClient {
  create = mockCreate;
  getHandle = mockGetHandle;
  list = vi.fn(async function* () {
    /* no-op */
  });

  constructor(...args: unknown[]) {
    mockScheduleClientConstructor(...args);
  }
}

vi.mock("../connection", () => ({
  createClientConnection: mockCreateClientConnection,
}));

vi.mock("@temporalio/client", () => ({
  Connection: {
    connect: mockCreateClientConnection,
  },
  ScheduleClient: MockScheduleClient,
}));

describe("registerSchedules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateClientConnection.mockResolvedValue({
      close: mockConnectionClose,
    });

    mockDescribe.mockRejectedValue(new Error("not found"));
    mockGetHandle.mockReturnValue({
      describe: mockDescribe,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  it("registers weekly knowledge cleanup schedule with correct workflow type", async () => {
    const { registerSchedules } = await import("../scripts/register-schedules");

    await registerSchedules(undefined, {
      temporalAddress: "temporal.test:7233",
      namespace: "test-namespace",
    });

    const call = mockCreate.mock.calls
      .map((entry) => entry[0])
      .find((entry) => entry?.scheduleId === "weekly-knowledge-cleanup");

    expect(call).toBeDefined();
    expect(call).toMatchObject({
      scheduleId: "weekly-knowledge-cleanup",
      action: {
        type: "startWorkflow",
        workflowType: "knowledgeCleanupWorkflow",
        taskQueue: TASK_QUEUES.SCHEDULED,
      },
      spec: {
        cronExpressions: ["0 4 * * 1"],
      },
    });

    expect(mockCreateClientConnection).toHaveBeenCalledWith({
      address: "temporal.test:7233",
    });
    expect(mockScheduleClientConstructor).toHaveBeenCalledWith({
      connection: { close: mockConnectionClose },
      namespace: "test-namespace",
    });
    expect(mockConnectionClose).toHaveBeenCalledOnce();
  });
});
