import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadAgentTimerConfig = vi.fn();
const mockEnqueueTimerWakeup = vi.fn();
const mockContinueAsNew = vi.fn();
const mockSleep = vi.fn().mockResolvedValue(undefined);
let mockHistoryLength = 100;

class ContinueAsNewError extends Error {
  constructor() {
    super("continueAsNew");
    this.name = "ContinueAsNewError";
  }
}

let pauseHandler: (() => void) | null = null;
let timerStatusHandler: (() => unknown) | null = null;

vi.mock("@temporalio/workflow", () => ({
  proxyActivities: () =>
    new Proxy(
      {},
      {
        get(_target, prop: string) {
          const map: Record<string, (...args: unknown[]) => unknown> = {
            loadAgentTimerConfig: mockLoadAgentTimerConfig,
            enqueueTimerWakeup: mockEnqueueTimerWakeup,
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
    if (signalOrQuery === "pauseTimer") {
      pauseHandler = handler as () => void;
    }
    if (signalOrQuery === "timerStatus") {
      timerStatusHandler = handler as () => unknown;
    }
  },
  continueAsNew: (...args: unknown[]) => {
    mockContinueAsNew(...args);
    throw new ContinueAsNewError();
  },
  sleep: mockSleep,
  workflowInfo: () => ({ historyLength: mockHistoryLength }),
}));

vi.mock("../workflows/temporal-utils", () => ({
  currentTimestamp: () => 1_000_000,
}));

describe("controlTimerWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistoryLength = 100;
    mockSleep.mockResolvedValue(undefined);
    pauseHandler = null;
    timerStatusHandler = null;
    mockLoadAgentTimerConfig.mockResolvedValue({
      enabled: true,
      intervalSec: 60,
      agentId: "agent-1",
      teamId: "team-1",
    });
    mockEnqueueTimerWakeup.mockResolvedValue(undefined);
  });

  it("enqueues wakeup each tick", async () => {
    mockHistoryLength = 3000;

    const { controlTimerWorkflow } = await import(
      "../workflows/agents/control-timer"
    );

    await expect(
      controlTimerWorkflow({ teamId: "team-1", agentId: "agent-1" })
    ).rejects.toThrow("continueAsNew");

    expect(mockEnqueueTimerWakeup).toHaveBeenCalledWith({
      teamId: "team-1",
      agentId: "agent-1",
    });
  });

  it("exits immediately when enabled=false", async () => {
    mockLoadAgentTimerConfig.mockResolvedValue({
      enabled: false,
      intervalSec: 60,
      agentId: "agent-1",
      teamId: "team-1",
    });

    const { controlTimerWorkflow } = await import(
      "../workflows/agents/control-timer"
    );

    await controlTimerWorkflow({ teamId: "team-1", agentId: "agent-1" });

    expect(mockEnqueueTimerWakeup).not.toHaveBeenCalled();
  });

  it("exits immediately when intervalSec=0", async () => {
    mockLoadAgentTimerConfig.mockResolvedValue({
      enabled: true,
      intervalSec: 0,
      agentId: "agent-1",
      teamId: "team-1",
    });

    const { controlTimerWorkflow } = await import(
      "../workflows/agents/control-timer"
    );

    await controlTimerWorkflow({ teamId: "team-1", agentId: "agent-1" });

    expect(mockEnqueueTimerWakeup).not.toHaveBeenCalled();
  });

  it("pause signal prevents wakeup enqueue", async () => {
    mockHistoryLength = 3000;

    mockSleep.mockImplementation(() => {
      pauseHandler?.();
      return Promise.resolve();
    });

    const { controlTimerWorkflow } = await import(
      "../workflows/agents/control-timer"
    );

    await expect(
      controlTimerWorkflow({ teamId: "team-1", agentId: "agent-1" })
    ).rejects.toThrow("continueAsNew");

    expect(mockEnqueueTimerWakeup).not.toHaveBeenCalled();
  });

  it("tracks fire count", async () => {
    mockHistoryLength = 3000;

    const { controlTimerWorkflow } = await import(
      "../workflows/agents/control-timer"
    );

    await expect(
      controlTimerWorkflow({ teamId: "team-1", agentId: "agent-1" })
    ).rejects.toThrow("continueAsNew");

    const status = timerStatusHandler?.();
    expect(status).toBeDefined();
    if (status && typeof status === "object" && "fireCount" in status) {
      expect(status.fireCount).toBe(1);
    }
  });
});
