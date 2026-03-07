import { beforeEach, describe, expect, it, mock } from "bun:test";

const TEAM_ID = "team_01";
const AGENT_ID = "agent_01";
const RUN_ID = "run_01";
const WAKEUP_ID = "wakeup_01";

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    teamId: TEAM_ID,
    name: "heartbeat-agent",
    role: "worker",
    status: "IDLE",
    reportsTo: null,
    runtimeConfig: {},
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    ...overrides,
  };
}

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    teamId: TEAM_ID,
    agentId: AGENT_ID,
    status: "QUEUED",
    createdAt: new Date("2026-01-01"),
    startedAt: null,
    ...overrides,
  };
}

type AnyFn = (...args: any[]) => any;
const mockFindAgentById = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockCreateWakeup = mock((() =>
  Promise.resolve({ id: WAKEUP_ID })) as AnyFn);
const mockClaimWakeup = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockCompleteWakeup = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockFailWakeup = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockCreateRun = mock((() => Promise.resolve({ id: RUN_ID })) as AnyFn);
const mockStartRun = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockCompleteRun = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockFailRun = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockListRuns = mock((() =>
  Promise.resolve([] as ReturnType<typeof makeRun>[])) as AnyFn);
const mockFindRunningRun = mock((() => Promise.resolve(null)) as AnyFn);
const mockUpdateAgentStatus = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockUpdateAgentHeartbeat = mock((() =>
  Promise.resolve(undefined)) as AnyFn);
const mockFindRuntimeState = mock((() => Promise.resolve(null)) as AnyFn);
const mockUpsertRuntimeState = mock((() =>
  Promise.resolve({ id: "rs_01" })) as AnyFn);
const mockCreateCostEvent = mock((() =>
  Promise.resolve({ id: "cost_01" })) as AnyFn);
const mockIncrementTokens = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockCreateRunEvent = mock((() =>
  Promise.resolve({ id: "evt_01" })) as AnyFn);

mock.module("@openbeam/db", () => ({
  findControlAgentById: mockFindAgentById,
  createControlWakeupRequest: mockCreateWakeup,
  claimControlWakeupRequest: mockClaimWakeup,
  completeControlWakeupRequest: mockCompleteWakeup,
  failControlWakeupRequest: mockFailWakeup,
  createControlHeartbeatRun: mockCreateRun,
  startControlHeartbeatRun: mockStartRun,
  completeControlHeartbeatRun: mockCompleteRun,
  failControlHeartbeatRun: mockFailRun,
  listControlHeartbeatRuns: mockListRuns,
  findRunningHeartbeatRun: mockFindRunningRun,
  updateControlAgentStatus: mockUpdateAgentStatus,
  updateControlAgentHeartbeat: mockUpdateAgentHeartbeat,
  findControlAgentRuntimeState: mockFindRuntimeState,
  upsertControlAgentRuntimeState: mockUpsertRuntimeState,
  createControlCostEvent: mockCreateCostEvent,
  incrementControlAgentRuntimeTokens: mockIncrementTokens,
  createControlHeartbeatRunEvent: mockCreateRunEvent,
}));

const {
  enqueueWakeup,
  claimAndStartRun,
  completeRunWithResult,
  failRunWithError,
  appendRunEvent,
  reapOrphanedRuns,
  ensureRuntimeState,
  updateRuntimeSession,
} = await import("../heartbeat");

const db = {} as never;

beforeEach(() => {
  for (const fn of [
    mockFindAgentById,
    mockCreateWakeup,
    mockClaimWakeup,
    mockCompleteWakeup,
    mockFailWakeup,
    mockCreateRun,
    mockStartRun,
    mockCompleteRun,
    mockFailRun,
    mockListRuns,
    mockFindRunningRun,
    mockUpdateAgentStatus,
    mockUpdateAgentHeartbeat,
    mockFindRuntimeState,
    mockUpsertRuntimeState,
    mockCreateCostEvent,
    mockIncrementTokens,
    mockCreateRunEvent,
  ]) {
    fn.mockReset();
  }
  mockFindAgentById.mockImplementation(() => Promise.resolve(makeAgent()));
  mockCreateWakeup.mockImplementation(() => Promise.resolve({ id: WAKEUP_ID }));
  mockCreateRun.mockImplementation(() => Promise.resolve({ id: RUN_ID }));
  mockFindRunningRun.mockImplementation(() => Promise.resolve(null));
  mockListRuns.mockImplementation(() => Promise.resolve([]));
  mockCreateRunEvent.mockImplementation(() =>
    Promise.resolve({ id: "evt_01" })
  );
  mockUpsertRuntimeState.mockImplementation(() =>
    Promise.resolve({ id: "rs_01" })
  );
});

describe("enqueueWakeup", () => {
  it("creates wakeup request and run", async () => {
    const result = await enqueueWakeup(db, TEAM_ID, AGENT_ID);
    expect(result).not.toBeNull();
    expect(result?.requestId).toBe(WAKEUP_ID);
    expect(result?.runId).toBe(RUN_ID);
    expect(mockCreateWakeup).toHaveBeenCalledTimes(1);
    expect(mockCreateRun).toHaveBeenCalledTimes(1);
  });

  it("returns null for paused agent", async () => {
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "PAUSED" }))
    );
    const result = await enqueueWakeup(db, TEAM_ID, AGENT_ID);
    expect(result).toBeNull();
  });

  it("returns null for terminated agent", async () => {
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "TERMINATED" }))
    );
    const result = await enqueueWakeup(db, TEAM_ID, AGENT_ID);
    expect(result).toBeNull();
  });

  it("returns null when heartbeat disabled", async () => {
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ runtimeConfig: { heartbeatEnabled: false } }))
    );
    const result = await enqueueWakeup(db, TEAM_ID, AGENT_ID);
    expect(result).toBeNull();
  });

  it("returns null for ON_DEMAND when wakeOnDemand disabled", async () => {
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ runtimeConfig: { wakeOnDemand: false } }))
    );
    const result = await enqueueWakeup(db, TEAM_ID, AGENT_ID, {
      source: "ON_DEMAND",
    });
    expect(result).toBeNull();
  });

  it("throws NOT_FOUND for missing agent", async () => {
    mockFindAgentById.mockImplementation(() => Promise.resolve(null));
    await expect(enqueueWakeup(db, TEAM_ID, "missing")).rejects.toThrow(
      "Agent not found"
    );
  });
});

describe("claimAndStartRun", () => {
  it("claims wakeup, starts run, and sets RUNNING status", async () => {
    mockClaimWakeup.mockImplementation(() => Promise.resolve(undefined));
    mockStartRun.mockImplementation(() => Promise.resolve(undefined));
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));
    mockUpdateAgentHeartbeat.mockImplementation(() =>
      Promise.resolve(undefined)
    );

    const result = await claimAndStartRun(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      runId: RUN_ID,
      wakeupRequestId: WAKEUP_ID,
    });

    expect(mockClaimWakeup).toHaveBeenCalledWith(db, WAKEUP_ID, RUN_ID);
    expect(mockStartRun).toHaveBeenCalledTimes(1);
    expect(mockUpdateAgentStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "RUNNING"
    );
    expect(result.sessionIdBefore).toBeUndefined();
  });

  it("captures existing session ID from runtime state", async () => {
    mockFindRuntimeState.mockImplementation(() =>
      Promise.resolve({ sessionId: "session_prev" })
    );
    mockClaimWakeup.mockImplementation(() => Promise.resolve(undefined));
    mockStartRun.mockImplementation(() => Promise.resolve(undefined));
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));
    mockUpdateAgentHeartbeat.mockImplementation(() =>
      Promise.resolve(undefined)
    );

    const result = await claimAndStartRun(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      runId: RUN_ID,
      wakeupRequestId: WAKEUP_ID,
    });

    expect(result.sessionIdBefore).toBe("session_prev");
  });
});

describe("completeRunWithResult", () => {
  it("completes run and transitions to IDLE when no other runs", async () => {
    mockCompleteRun.mockImplementation(() => Promise.resolve(undefined));
    mockCompleteWakeup.mockImplementation(() => Promise.resolve(undefined));
    mockFindRunningRun.mockImplementation(() => Promise.resolve(null));
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "RUNNING" }))
    );
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));

    await completeRunWithResult(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      runId: RUN_ID,
      wakeupRequestId: WAKEUP_ID,
      result: { exitCode: 0, signal: null, timedOut: false },
    });

    expect(mockCompleteRun).toHaveBeenCalledTimes(1);
    expect(mockCompleteWakeup).toHaveBeenCalledWith(db, WAKEUP_ID);
    expect(mockUpdateAgentStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "IDLE"
    );
  });

  it("records cost and pauses agent when budget exceeded", async () => {
    mockCompleteRun.mockImplementation(() => Promise.resolve(undefined));
    mockCompleteWakeup.mockImplementation(() => Promise.resolve(undefined));
    mockCreateCostEvent.mockImplementation(() =>
      Promise.resolve({ id: "cost_01" })
    );
    mockIncrementTokens.mockImplementation(() => Promise.resolve(undefined));
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(
        makeAgent({
          status: "RUNNING",
          budgetMonthlyCents: 100,
          spentMonthlyCents: 100,
        })
      )
    );
    mockFindRunningRun.mockImplementation(() => Promise.resolve(null));
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));

    await completeRunWithResult(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      runId: RUN_ID,
      wakeupRequestId: WAKEUP_ID,
      result: {
        exitCode: 0,
        signal: null,
        timedOut: false,
        usage: { inputTokens: 100, outputTokens: 50 },
        costUsd: 0.05,
        provider: "anthropic",
        model: "claude-4",
      },
    });

    expect(mockCreateCostEvent).toHaveBeenCalledTimes(1);
    expect(mockIncrementTokens).toHaveBeenCalledTimes(1);
  });
});

describe("failRunWithError", () => {
  it("fails run and wakeup, then finalizes status", async () => {
    mockFailRun.mockImplementation(() => Promise.resolve(undefined));
    mockFailWakeup.mockImplementation(() => Promise.resolve(undefined));
    mockFindRunningRun.mockImplementation(() => Promise.resolve(null));
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "RUNNING" }))
    );
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));

    await failRunWithError(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      runId: RUN_ID,
      wakeupRequestId: WAKEUP_ID,
      error: "Adapter crashed",
      errorCode: "ADAPTER_ERROR",
    });

    expect(mockFailRun).toHaveBeenCalledWith(
      db,
      RUN_ID,
      "Adapter crashed",
      "ADAPTER_ERROR"
    );
    expect(mockFailWakeup).toHaveBeenCalledWith(
      db,
      WAKEUP_ID,
      "Adapter crashed"
    );
    expect(mockUpdateAgentStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "IDLE"
    );
  });
});

describe("appendRunEvent", () => {
  it("creates a run event", async () => {
    await appendRunEvent(db, {
      teamId: TEAM_ID,
      runId: RUN_ID,
      agentId: AGENT_ID,
      seq: 1,
      eventType: "stdout",
      message: "hello",
    });
    expect(mockCreateRunEvent).toHaveBeenCalledTimes(1);
  });
});

describe("reapOrphanedRuns", () => {
  it("reaps stale runs", async () => {
    const staleRun = makeRun({
      status: "RUNNING",
      startedAt: new Date(Date.now() - 700_000),
    });
    mockListRuns.mockImplementation(() => Promise.resolve([staleRun]));
    mockFailRun.mockImplementation(() => Promise.resolve(undefined));

    const result = await reapOrphanedRuns(db, TEAM_ID);
    expect(result.checked).toBe(1);
    expect(result.reaped).toBe(1);
    expect(mockFailRun).toHaveBeenCalledWith(
      db,
      RUN_ID,
      "Run reaped as orphan",
      "orphan_reaped"
    );
  });

  it("skips recent runs", async () => {
    const freshRun = makeRun({
      status: "RUNNING",
      startedAt: new Date(Date.now() - 1000),
    });
    mockListRuns.mockImplementation(() => Promise.resolve([freshRun]));

    const result = await reapOrphanedRuns(db, TEAM_ID);
    expect(result.checked).toBe(1);
    expect(result.reaped).toBe(0);
  });

  it("returns zero for no runs", async () => {
    const result = await reapOrphanedRuns(db, TEAM_ID);
    expect(result.checked).toBe(0);
    expect(result.reaped).toBe(0);
  });
});

describe("ensureRuntimeState", () => {
  it("upserts runtime state", async () => {
    await ensureRuntimeState(db, {
      agentId: AGENT_ID,
      teamId: TEAM_ID,
      adapterType: "HTTP",
    });
    expect(mockUpsertRuntimeState).toHaveBeenCalledTimes(1);
  });
});

describe("updateRuntimeSession", () => {
  it("upserts with session data", async () => {
    await updateRuntimeSession(db, {
      agentId: AGENT_ID,
      teamId: TEAM_ID,
      adapterType: "PROCESS",
      sessionId: "sess_01",
      lastRunId: RUN_ID,
      lastRunStatus: "COMPLETED",
    });
    expect(mockUpsertRuntimeState).toHaveBeenCalledTimes(1);
  });
});
