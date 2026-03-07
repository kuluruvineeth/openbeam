import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadPendingWakeupRequests = vi.fn();
const mockExecuteChild = vi.fn();
const mockContinueAsNew = vi.fn();
let mockHistoryLength = 100;

class ContinueAsNewError extends Error {
  constructor() {
    super("continueAsNew");
    this.name = "ContinueAsNewError";
  }
}

vi.mock("@temporalio/workflow", () => {
  let schedulerStatusHandler: (() => unknown) | null = null;

  return {
    proxyActivities: () =>
      new Proxy(
        {},
        {
          get(_target, prop: string) {
            const map: Record<string, (...args: unknown[]) => unknown> = {
              loadPendingWakeupRequests: mockLoadPendingWakeupRequests,
            };
            return map[prop];
          },
        }
      ),
    defineQuery: (name: string) => name,
    defineSignal: (name: string) => name,
    setHandler: (
      signalOrQuery: string,
      handler: (...args: unknown[]) => void
    ) => {
      if (signalOrQuery === "schedulerStatus") {
        schedulerStatusHandler = handler as () => unknown;
      }
    },
    executeChild: mockExecuteChild,
    continueAsNew: (...args: unknown[]) => {
      mockContinueAsNew(...args);
      throw new ContinueAsNewError();
    },
    sleep: () => Promise.resolve(),
    workflowInfo: () => ({ historyLength: mockHistoryLength }),
    _getSchedulerStatusHandler: () => schedulerStatusHandler,
  };
});

vi.mock("../../utils/workflow-id", () => ({
  generateWorkflowId: (opts: Record<string, string>) =>
    `${opts.type}:${opts.agentId}:${opts.runId}`,
}));

vi.mock("../workflows/temporal-utils", () => ({
  currentTimestamp: () => 1_000_000,
}));

describe("controlSchedulerWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryLength = 100;
    mockLoadPendingWakeupRequests.mockResolvedValue({ requests: [] });
    mockExecuteChild.mockResolvedValue(undefined);
  });

  it("dispatches heartbeat children per wakeup request", async () => {
    mockHistoryLength = 5000;

    mockLoadPendingWakeupRequests.mockResolvedValue({
      requests: [
        {
          id: "req-1",
          agentId: "agent-1",
          adapterType: "HTTP",
          adapterConfig: {},
          runtimeConfig: {},
          payload: undefined,
          reason: "scheduled",
          source: "TIMER",
        },
        {
          id: "req-2",
          agentId: "agent-2",
          adapterType: "PROCESS",
          adapterConfig: {},
          runtimeConfig: {},
          payload: undefined,
          reason: undefined,
          source: "ON_DEMAND",
        },
      ],
    });

    const { controlSchedulerWorkflow } = await import(
      "../workflows/agents/control-scheduler"
    );

    await expect(
      controlSchedulerWorkflow({ teamId: "team-1" })
    ).rejects.toThrow("continueAsNew");

    expect(mockExecuteChild).toHaveBeenCalledTimes(2);
    expect(mockLoadPendingWakeupRequests).toHaveBeenCalledWith({
      teamId: "team-1",
    });
  });

  it("skips requests with null adapterType", async () => {
    mockHistoryLength = 5000;

    mockLoadPendingWakeupRequests.mockResolvedValue({
      requests: [
        {
          id: "req-1",
          agentId: "agent-1",
          adapterType: null,
          adapterConfig: {},
          runtimeConfig: {},
          payload: undefined,
          reason: undefined,
          source: "TIMER",
        },
      ],
    });

    const { controlSchedulerWorkflow } = await import(
      "../workflows/agents/control-scheduler"
    );

    await expect(
      controlSchedulerWorkflow({ teamId: "team-1" })
    ).rejects.toThrow("continueAsNew");

    expect(mockExecuteChild).not.toHaveBeenCalled();
  });

  it("calls continueAsNew when history overflows", async () => {
    mockHistoryLength = 5000;
    mockLoadPendingWakeupRequests.mockResolvedValue({ requests: [] });

    const { controlSchedulerWorkflow } = await import(
      "../workflows/agents/control-scheduler"
    );

    await expect(
      controlSchedulerWorkflow({ teamId: "team-1" })
    ).rejects.toThrow("continueAsNew");

    expect(mockContinueAsNew).toHaveBeenCalledWith({ teamId: "team-1" });
  });

  it("scheduler status query returns accurate state", async () => {
    mockHistoryLength = 5000;

    mockLoadPendingWakeupRequests.mockResolvedValue({
      requests: [
        {
          id: "req-1",
          agentId: "agent-1",
          adapterType: "HTTP",
          adapterConfig: {},
          runtimeConfig: {},
          payload: undefined,
          reason: undefined,
          source: "TIMER",
        },
      ],
    });

    const mod = await import("@temporalio/workflow");
    const { controlSchedulerWorkflow } = await import(
      "../workflows/agents/control-scheduler"
    );

    await expect(
      controlSchedulerWorkflow({ teamId: "team-1" })
    ).rejects.toThrow("continueAsNew");

    const getHandler = (mod as any)._getSchedulerStatusHandler;
    const handler = getHandler?.();
    const status = handler?.();
    expect(status).toBeDefined();
    if (status) {
      expect(status.teamId).toBe("team-1");
      expect(status.tickCount).toBe(1);
      expect(status.dispatchedCount).toBe(1);
    }
  });
});
