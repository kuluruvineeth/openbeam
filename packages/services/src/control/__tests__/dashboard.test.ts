import { beforeEach, describe, expect, it, mock } from "bun:test";

const TEAM_ID = "team_01";

type AnyFn = (...args: any[]) => any;
const mockCountAgents = mock((() => Promise.resolve(0)) as AnyFn);
const mockCountIssues = mock((() => Promise.resolve(0)) as AnyFn);
const mockAggregateCosts = mock((() =>
  Promise.resolve({
    _sum: { costCents: 200, inputTokens: 5000, outputTokens: 2000 },
    _count: 5,
  })) as AnyFn);
const mockListApprovals = mock((() => Promise.resolve([])) as AnyFn);
const mockListIssues = mock((() => Promise.resolve([])) as AnyFn);
const mockListActivityLogs = mock((() => Promise.resolve([])) as AnyFn);

mock.module("@openbeam/db", () => ({
  countControlAgents: mockCountAgents,
  countControlIssues: mockCountIssues,
  aggregateControlCosts: mockAggregateCosts,
  listControlApprovals: mockListApprovals,
  listControlIssues: mockListIssues,
  listControlActivityLogs: mockListActivityLogs,
}));

const {
  getControlDashboardSummary,
  getControlSidebarBadges,
  getControlRecentActivity,
} = await import("../dashboard");

const db = {} as never;

beforeEach(() => {
  for (const fn of [
    mockCountAgents,
    mockCountIssues,
    mockAggregateCosts,
    mockListApprovals,
    mockListIssues,
    mockListActivityLogs,
  ]) {
    fn.mockReset();
  }
  mockCountAgents.mockImplementation(() => Promise.resolve(0));
  mockCountIssues.mockImplementation(() => Promise.resolve(0));
  mockAggregateCosts.mockImplementation(() =>
    Promise.resolve({
      _sum: { costCents: 200, inputTokens: 5000, outputTokens: 2000 },
      _count: 5,
    })
  );
  mockListApprovals.mockImplementation(() => Promise.resolve([]));
  mockListIssues.mockImplementation(() => Promise.resolve([]));
  mockListActivityLogs.mockImplementation(() => Promise.resolve([]));
});

describe("getControlDashboardSummary", () => {
  it("returns agent, issue, cost, and approval counts", async () => {
    let agentCallIdx = 0;
    mockCountAgents.mockImplementation(() => {
      agentCallIdx += 1;
      const values = [3, 1, 0, 0, 4];
      return Promise.resolve(values[agentCallIdx - 1] ?? 0);
    });

    let issueCallIdx = 0;
    mockCountIssues.mockImplementation(() => {
      issueCallIdx += 1;
      const values = [2, 5, 3, 1, 0, 11];
      return Promise.resolve(values[issueCallIdx - 1] ?? 0);
    });

    mockListApprovals.mockImplementation(() =>
      Promise.resolve([{ id: "apr_01" }, { id: "apr_02" }])
    );

    const result = await getControlDashboardSummary(db, TEAM_ID);

    expect(result.agents.idle).toBe(3);
    expect(result.agents.running).toBe(1);
    expect(result.agents.total).toBe(4);
    expect(result.issues.backlog).toBe(2);
    expect(result.issues.todo).toBe(5);
    expect(result.issues.total).toBe(11);
    expect(result.costs.spendCents).toBe(200);
    expect(result.pendingApprovalCount).toBe(2);
  });
});

describe("getControlSidebarBadges", () => {
  it("returns badge counts", async () => {
    mockListApprovals.mockImplementation(() =>
      Promise.resolve([{ id: "apr_01" }])
    );
    mockListIssues.mockImplementation(() => Promise.resolve([]));
    mockCountAgents.mockImplementation(() => Promise.resolve(2));

    const result = await getControlSidebarBadges(db, TEAM_ID);

    expect(result.pendingApprovalCount).toBe(1);
    expect(result.staleIssueCount).toBe(0);
    expect(result.runningAgentCount).toBe(2);
  });

  it("detects stale issues", async () => {
    mockListApprovals.mockImplementation(() => Promise.resolve([]));
    const staleDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    mockListIssues.mockImplementation(() =>
      Promise.resolve([
        { id: "iss_1", updatedAt: staleDate },
        { id: "iss_2", updatedAt: new Date() },
      ])
    );
    mockCountAgents.mockImplementation(() => Promise.resolve(0));

    const result = await getControlSidebarBadges(db, TEAM_ID);
    expect(result.staleIssueCount).toBe(1);
  });
});

describe("getControlRecentActivity", () => {
  it("delegates with limit", async () => {
    await getControlRecentActivity(db, TEAM_ID, 15);
    expect(mockListActivityLogs).toHaveBeenCalledWith(db, TEAM_ID, {
      limit: 15,
    });
  });

  it("uses default limit of 20", async () => {
    await getControlRecentActivity(db, TEAM_ID);
    expect(mockListActivityLogs).toHaveBeenCalledWith(db, TEAM_ID, {
      limit: 20,
    });
  });
});
