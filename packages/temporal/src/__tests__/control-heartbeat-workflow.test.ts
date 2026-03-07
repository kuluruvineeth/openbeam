import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClaimAndStartRun = vi.fn();
const mockExecuteAdapter = vi.fn();
const mockCompleteRun = vi.fn();
const mockFailRun = vi.fn();
const mockUpdateRuntimeState = vi.fn();
const mockPublishRunEvent = vi.fn();
const mockLogActivity = vi.fn();
const mockLoadAgentForRun = vi.fn();

vi.mock("@temporalio/workflow", () => {
  let cancelHandler: (() => void) | null = null;
  let queryHandler: (() => unknown) | null = null;

  return {
    proxyActivities: () =>
      new Proxy(
        {},
        {
          get(_target, prop: string) {
            const activityMap: Record<string, (...args: unknown[]) => unknown> =
              {
                claimAndStartRun: mockClaimAndStartRun,
                executeAdapter: mockExecuteAdapter,
                completeRun: mockCompleteRun,
                failRun: mockFailRun,
                updateRuntimeState: mockUpdateRuntimeState,
                publishRunEvent: mockPublishRunEvent,
                logActivity: mockLogActivity,
                loadAgentForRun: mockLoadAgentForRun,
              };
            return activityMap[prop];
          },
        }
      ),
    defineSignal: (name: string) => name,
    defineQuery: (name: string) => name,
    setHandler: (
      signalOrQuery: string,
      handler: (...args: unknown[]) => void
    ) => {
      if (signalOrQuery === "cancelHeartbeat") {
        cancelHandler = handler as () => void;
      }
      if (signalOrQuery === "heartbeatState") {
        queryHandler = handler as () => unknown;
      }
    },
    condition: async () => true,
    sleep: () => Promise.resolve(),
    workflowInfo: () => ({ historyLength: 100 }),
    _getCancelHandler: () => cancelHandler,
    _getQueryHandler: () => queryHandler,
  };
});

vi.mock("@openbeam/types/temporal/agent-timeouts", () => ({
  TIMEOUT_TIERS: {
    quick: {
      startToCloseTimeout: "5m",
      scheduleToCloseTimeout: "10m",
      heartbeatTimeout: "30s",
    },
    standard: {
      startToCloseTimeout: "30m",
      scheduleToCloseTimeout: "1h",
      heartbeatTimeout: "2m",
    },
    extended: {
      startToCloseTimeout: "2h",
      scheduleToCloseTimeout: "4h",
      heartbeatTimeout: "5m",
    },
    marathon: {
      startToCloseTimeout: "24h",
      scheduleToCloseTimeout: "48h",
      heartbeatTimeout: "10m",
    },
  },
}));

function baseInput() {
  return {
    teamId: "team-1",
    agentId: "agent-1",
    runId: "run-1",
    wakeupRequestId: "req-1",
    adapterType: "claude-code",
    adapterConfig: { model: "opus" },
    runtimeConfig: {},
    invocationSource: "ON_DEMAND",
  };
}

describe("controlHeartbeatWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClaimAndStartRun.mockResolvedValue({ sessionIdBefore: "session-0" });
    mockExecuteAdapter.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      sessionId: "session-1",
      raw: {
        exitCode: 0,
        signal: null,
        timedOut: false,
        sessionId: "session-1",
      },
    });
    mockCompleteRun.mockResolvedValue(undefined);
    mockFailRun.mockResolvedValue(undefined);
    mockUpdateRuntimeState.mockResolvedValue(undefined);
    mockPublishRunEvent.mockResolvedValue(undefined);
  });

  it("happy path: claim → execute → complete", async () => {
    const { controlHeartbeatWorkflow } = await import(
      "../workflows/agents/control-heartbeat"
    );

    await controlHeartbeatWorkflow(baseInput());

    expect(mockClaimAndStartRun).toHaveBeenCalledTimes(1);
    expect(mockExecuteAdapter).toHaveBeenCalledTimes(1);
    expect(mockCompleteRun).toHaveBeenCalledTimes(1);
    expect(mockFailRun).not.toHaveBeenCalled();

    expect(mockPublishRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "run_started" })
    );
    expect(mockPublishRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "run_completed", status: "COMPLETED" })
    );
  });

  it("execution failure → failRun + error notification", async () => {
    mockExecuteAdapter.mockRejectedValue(new Error("Adapter crashed"));

    const { controlHeartbeatWorkflow } = await import(
      "../workflows/agents/control-heartbeat"
    );

    await controlHeartbeatWorkflow(baseInput());

    expect(mockFailRun).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Adapter crashed",
        errorCode: "workflow_error",
      })
    );
    expect(mockPublishRunEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "run_completed", status: "FAILED" })
    );
    expect(mockCompleteRun).not.toHaveBeenCalled();
  });

  it("updates runtime state when sessionId is returned", async () => {
    const { controlHeartbeatWorkflow } = await import(
      "../workflows/agents/control-heartbeat"
    );

    await controlHeartbeatWorkflow(baseInput());

    expect(mockUpdateRuntimeState).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        adapterType: "claude-code",
        sessionId: "session-1",
        lastRunId: "run-1",
        lastRunStatus: "COMPLETED",
      })
    );
  });

  it("does not update runtime state when no sessionId", async () => {
    mockExecuteAdapter.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      sessionId: null,
      raw: { exitCode: 0, signal: null, timedOut: false },
    });

    const { controlHeartbeatWorkflow } = await import(
      "../workflows/agents/control-heartbeat"
    );

    await controlHeartbeatWorkflow(baseInput());

    expect(mockUpdateRuntimeState).not.toHaveBeenCalled();
  });

  it("claim failure propagates to failRun", async () => {
    mockClaimAndStartRun.mockRejectedValue(new Error("Already claimed"));

    const { controlHeartbeatWorkflow } = await import(
      "../workflows/agents/control-heartbeat"
    );

    await controlHeartbeatWorkflow(baseInput());

    expect(mockFailRun).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Already claimed" })
    );
    expect(mockExecuteAdapter).not.toHaveBeenCalled();
  });
});
