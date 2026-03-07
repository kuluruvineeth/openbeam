import { beforeEach, describe, expect, it, mock } from "bun:test";

const TEAM_ID = "team_01";
const AGENT_ID = "agent_01";

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    teamId: TEAM_ID,
    status: "IDLE",
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    ...overrides,
  };
}

function makeCostEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "cost_01",
    teamId: TEAM_ID,
    agentId: AGENT_ID,
    provider: "anthropic",
    model: "claude-4",
    inputTokens: 100,
    outputTokens: 50,
    costCents: 5,
    occurredAt: new Date("2026-01-15"),
    ...overrides,
  };
}

type AnyFn = (...args: any[]) => any;
const mockFindAgentById = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockCreateCostEvent = mock((() =>
  Promise.resolve(makeCostEvent())) as AnyFn);
const mockListCostEvents = mock((() =>
  Promise.resolve([makeCostEvent()])) as AnyFn);
const mockAggregateCosts = mock((() =>
  Promise.resolve({
    _sum: { costCents: 500, inputTokens: 10_000, outputTokens: 5000 },
    _count: 10,
  })) as AnyFn);
const mockIncrementTeamConsumed = mock((() =>
  Promise.resolve(undefined)) as AnyFn);
const mockUpdateAgentStatus = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockUpdateTeamBudget = mock((() => Promise.resolve(undefined)) as AnyFn);

mock.module("@openbeam/db", () => ({
  findControlAgentById: mockFindAgentById,
  createControlCostEvent: mockCreateCostEvent,
  listControlCostEvents: mockListCostEvents,
  aggregateControlCosts: mockAggregateCosts,
  incrementTeamConsumedCents: mockIncrementTeamConsumed,
  updateControlAgentStatus: mockUpdateAgentStatus,
  updateTeamBudget: mockUpdateTeamBudget,
}));

const {
  recordControlCostEvent,
  listControlCostEventsForTeam,
  getControlCostSummaryForTeam,
  getControlCostByAgentForTeam,
  updateControlBudgetForTeam,
} = await import("../costs");

const db = {} as never;

beforeEach(() => {
  for (const fn of [
    mockFindAgentById,
    mockCreateCostEvent,
    mockListCostEvents,
    mockAggregateCosts,
    mockIncrementTeamConsumed,
    mockUpdateAgentStatus,
    mockUpdateTeamBudget,
  ]) {
    fn.mockReset();
  }
  mockFindAgentById.mockImplementation(() => Promise.resolve(makeAgent()));
  mockCreateCostEvent.mockImplementation(() =>
    Promise.resolve(makeCostEvent())
  );
  mockListCostEvents.mockImplementation(() =>
    Promise.resolve([makeCostEvent()])
  );
  mockAggregateCosts.mockImplementation(() =>
    Promise.resolve({
      _sum: { costCents: 500, inputTokens: 10_000, outputTokens: 5000 },
      _count: 10,
    })
  );
});

describe("recordControlCostEvent", () => {
  const input = {
    agentId: AGENT_ID,
    provider: "anthropic",
    model: "claude-4",
    inputTokens: 100,
    outputTokens: 50,
    costCents: 5,
    occurredAt: new Date("2026-01-15"),
  };

  it("creates cost event and increments team spend", async () => {
    mockIncrementTeamConsumed.mockImplementation(() =>
      Promise.resolve(undefined)
    );
    const result = await recordControlCostEvent(db, TEAM_ID, input);
    expect(result.id).toBe("cost_01");
    expect(mockCreateCostEvent).toHaveBeenCalledTimes(1);
    expect(mockIncrementTeamConsumed).toHaveBeenCalledWith(db, TEAM_ID, 5);
  });

  it("skips team increment when costCents is 0", async () => {
    mockIncrementTeamConsumed.mockImplementation(() =>
      Promise.resolve(undefined)
    );
    await recordControlCostEvent(db, TEAM_ID, { ...input, costCents: 0 });
    expect(mockIncrementTeamConsumed).not.toHaveBeenCalled();
  });

  it("pauses agent when budget exceeded", async () => {
    mockFindAgentById.mockImplementation(() =>
      Promise.resolve(
        makeAgent({
          budgetMonthlyCents: 100,
          spentMonthlyCents: 96,
        })
      )
    );
    mockUpdateAgentStatus.mockImplementation(() => Promise.resolve(undefined));
    mockIncrementTeamConsumed.mockImplementation(() =>
      Promise.resolve(undefined)
    );

    await recordControlCostEvent(db, TEAM_ID, input);
    expect(mockUpdateAgentStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "PAUSED"
    );
  });

  it("throws NOT_FOUND for missing agent", async () => {
    mockFindAgentById.mockImplementation(() => Promise.resolve(null));
    await expect(recordControlCostEvent(db, TEAM_ID, input)).rejects.toThrow(
      "Agent not found"
    );
  });
});

describe("listControlCostEventsForTeam", () => {
  it("delegates with options", async () => {
    const result = await listControlCostEventsForTeam(db, TEAM_ID, {
      agentId: AGENT_ID,
      limit: 10,
    });
    expect(result).toHaveLength(1);
    expect(mockListCostEvents).toHaveBeenCalledWith(db, TEAM_ID, {
      agentId: AGENT_ID,
      limit: 10,
    });
  });
});

describe("getControlCostSummaryForTeam", () => {
  it("returns aggregated cost summary", async () => {
    const result = await getControlCostSummaryForTeam(db, TEAM_ID);
    expect(result.totalCostCents).toBe(500);
    expect(result.totalInputTokens).toBe(10_000);
    expect(result.totalOutputTokens).toBe(5000);
    expect(result.eventCount).toBe(10);
  });
});

describe("getControlCostByAgentForTeam", () => {
  it("aggregates costs by agent", async () => {
    mockListCostEvents.mockImplementation(() =>
      Promise.resolve([
        makeCostEvent({
          agentId: "a1",
          costCents: 10,
          inputTokens: 100,
          outputTokens: 50,
        }),
        makeCostEvent({
          agentId: "a1",
          costCents: 20,
          inputTokens: 200,
          outputTokens: 100,
        }),
        makeCostEvent({
          agentId: "a2",
          costCents: 5,
          inputTokens: 50,
          outputTokens: 25,
        }),
      ])
    );

    const result = await getControlCostByAgentForTeam(db, TEAM_ID);
    expect(result).toHaveLength(2);

    const a1 = result.find((r) => r.agentId === "a1");
    expect(a1?.costCents).toBe(30);
    expect(a1?.count).toBe(2);

    const a2 = result.find((r) => r.agentId === "a2");
    expect(a2?.costCents).toBe(5);
    expect(a2?.count).toBe(1);
  });
});

describe("updateControlBudgetForTeam", () => {
  it("delegates to db", async () => {
    mockUpdateTeamBudget.mockImplementation(() => Promise.resolve(undefined));
    await updateControlBudgetForTeam(db, TEAM_ID, 50_000);
    expect(mockUpdateTeamBudget).toHaveBeenCalledWith(db, TEAM_ID, 50_000);
  });
});
