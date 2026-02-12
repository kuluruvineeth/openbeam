import { beforeEach, describe, expect, it } from "bun:test";
import type { MissionEventLedgerItem } from "@openplane/types/mission-control";
import {
  applyEventToAgentBoard,
  applyEventToApprovals,
  applyEventToBudget,
} from "../mission-runtime-store";

function createEvent(
  overrides: Partial<MissionEventLedgerItem> = {}
): MissionEventLedgerItem {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
    missionId: "mission-1",
    runId: "run-1",
    lane: "autonomous",
    sequence: 1,
    eventType: "run.started",
    summary: "Test event",
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("useMissionRuntimeStore", () => {
  let store: typeof import("../mission-runtime-store").useMissionRuntimeStore;

  beforeEach(async () => {
    const mod = await import("../mission-runtime-store");
    store = mod.useMissionRuntimeStore;
    store.getState().resetAll();
  });

  describe("ingestEvent", () => {
    it("adds event to eventsByRun", () => {
      const event = createEvent({ sequence: 1 });
      store.getState().ingestEvent("run-1", event);

      expect(store.getState().eventsByRun["run-1"]).toHaveLength(1);
      expect(store.getState().eventsByRun["run-1"]?.[0]).toEqual(event);
    });

    it("updates resumeCursor", () => {
      const event = createEvent({ sequence: 5 });
      store.getState().ingestEvent("run-1", event);

      expect(store.getState().resumeCursor["run-1"]).toBe(5);
    });

    it("skips duplicate events with sequence <= cursor", () => {
      const event1 = createEvent({ sequence: 3 });
      const event2 = createEvent({ sequence: 2 });
      const event3 = createEvent({ sequence: 3 });

      store.getState().ingestEvent("run-1", event1);
      store.getState().ingestEvent("run-1", event2);
      store.getState().ingestEvent("run-1", event3);

      expect(store.getState().eventsByRun["run-1"]).toHaveLength(1);
      expect(store.getState().resumeCursor["run-1"]).toBe(3);
    });

    it("accepts events with increasing sequences", () => {
      store.getState().ingestEvent("run-1", createEvent({ sequence: 1 }));
      store.getState().ingestEvent("run-1", createEvent({ sequence: 2 }));
      store.getState().ingestEvent("run-1", createEvent({ sequence: 3 }));

      expect(store.getState().eventsByRun["run-1"]).toHaveLength(3);
      expect(store.getState().resumeCursor["run-1"]).toBe(3);
    });
  });

  describe("replayFromCursor", () => {
    it("replays all events and builds projections", () => {
      const events = [
        createEvent({
          sequence: 1,
          eventType: "run.started",
          payload: { agentId: "agent-1" },
          agentName: "Researcher",
        }),
        createEvent({
          sequence: 2,
          eventType: "approval.requested",
          payload: {
            approvalId: "appr-1",
            intent: "deploy",
            riskLevel: "high",
          },
          agentName: "Deployer",
        }),
        createEvent({
          sequence: 3,
          eventType: "cost.updated",
          payload: {
            consumedCents: 150,
            agentId: "agent-1",
            costCents: 150,
          },
        }),
      ];

      store.getState().replayFromCursor("run-1", events);

      expect(store.getState().eventsByRun["run-1"]).toHaveLength(3);
      expect(store.getState().resumeCursor["run-1"]).toBe(3);
      expect(store.getState().agentBoardState["agent-1"]?.status).toBe(
        "running"
      );
      expect(store.getState().approvalQueue).toHaveLength(1);
      expect(store.getState().budgetState.consumedCents).toBe(150);
    });

    it("sets cursor to 0 when events array is empty", () => {
      store.getState().replayFromCursor("run-1", []);
      expect(store.getState().resumeCursor["run-1"]).toBe(0);
    });

    it("replays events chronologically when source events are reverse-ordered", () => {
      const events = [
        createEvent({
          sequence: 2,
          timestamp: 2000,
          eventType: "run.completed",
          payload: { agentId: "agent-1" },
          agentName: "Researcher",
        }),
        createEvent({
          sequence: 1,
          timestamp: 1000,
          eventType: "run.started",
          payload: { agentId: "agent-1" },
          agentName: "Researcher",
        }),
      ];

      store.getState().replayFromCursor("run-1", events);

      expect(store.getState().agentBoardState["agent-1"]?.status).toBe(
        "completed"
      );
    });
  });

  describe("reset", () => {
    it("clears only the specified run", () => {
      store
        .getState()
        .ingestEvent("run-1", createEvent({ sequence: 1, runId: "run-1" }));
      store
        .getState()
        .ingestEvent("run-2", createEvent({ sequence: 1, runId: "run-2" }));

      store.getState().reset("run-1");

      expect(store.getState().eventsByRun["run-1"]).toBeUndefined();
      expect(store.getState().resumeCursor["run-1"]).toBeUndefined();
      expect(store.getState().eventsByRun["run-2"]).toHaveLength(1);
      expect(store.getState().resumeCursor["run-2"]).toBe(1);
    });
  });

  describe("resetAll", () => {
    it("clears everything", () => {
      store.getState().ingestEvent(
        "run-1",
        createEvent({
          sequence: 1,
          eventType: "run.started",
          payload: { agentId: "agent-1" },
        })
      );
      store.getState().ingestEvent(
        "run-1",
        createEvent({
          sequence: 2,
          eventType: "approval.requested",
          payload: { approvalId: "appr-1" },
        })
      );
      store.getState().ingestEvent(
        "run-1",
        createEvent({
          sequence: 3,
          eventType: "cost.updated",
          payload: { consumedCents: 100 },
        })
      );

      store.getState().resetAll();

      expect(store.getState().eventsByRun).toEqual({});
      expect(store.getState().resumeCursor).toEqual({});
      expect(store.getState().agentBoardState).toEqual({});
      expect(store.getState().approvalQueue).toEqual([]);
      expect(store.getState().budgetState).toEqual({
        consumedCents: 0,
        budgetCents: 0,
        burnRateCentsPerMinute: 0,
        perAgentCosts: {},
      });
    });
  });
});

describe("seedAgentBoard", () => {
  let store: typeof import("../mission-runtime-store").useMissionRuntimeStore;

  beforeEach(async () => {
    const mod = await import("../mission-runtime-store");
    store = mod.useMissionRuntimeStore;
    store.getState().resetAll();
  });

  it("creates agents in the board with correct role and status", () => {
    store.getState().seedAgentBoard([
      { id: "agent-1", name: "Researcher", role: "specialist", status: "idle" },
      {
        id: "agent-2",
        name: "Coordinator",
        role: "coordinator",
        status: "running",
      },
    ]);

    const board = store.getState().agentBoardState;
    expect(Object.keys(board)).toHaveLength(2);
    expect(board["agent-1"]?.agentName).toBe("Researcher");
    expect(board["agent-1"]?.role).toBe("specialist");
    expect(board["agent-1"]?.status).toBe("idle");
    expect(board["agent-2"]?.agentName).toBe("Coordinator");
    expect(board["agent-2"]?.role).toBe("coordinator");
    expect(board["agent-2"]?.status).toBe("running");
  });

  it("does not overwrite existing agents from events", () => {
    store.getState().ingestEvent(
      "run-1",
      createEvent({
        sequence: 1,
        eventType: "run.started",
        payload: { agentId: "agent-1", role: "specialist" },
        agentName: "Researcher",
      })
    );

    store.getState().seedAgentBoard([
      {
        id: "agent-1",
        name: "Researcher",
        role: "specialist",
        status: "idle",
      },
    ]);

    const agent = store.getState().agentBoardState["agent-1"];
    expect(agent?.status).toBe("running");
  });

  it("fills in role for existing agents with empty role", () => {
    store.getState().ingestEvent(
      "run-1",
      createEvent({
        sequence: 1,
        eventType: "run.started",
        payload: { agentId: "agent-1" },
        agentName: "Researcher",
      })
    );

    expect(store.getState().agentBoardState["agent-1"]?.role).toBe("");

    store.getState().seedAgentBoard([
      {
        id: "agent-1",
        name: "Researcher",
        role: "coordinator",
        status: "idle",
      },
    ]);

    expect(store.getState().agentBoardState["agent-1"]?.role).toBe(
      "coordinator"
    );
    expect(store.getState().agentBoardState["agent-1"]?.status).toBe("running");
  });

  it("handles empty agents array", () => {
    store.getState().seedAgentBoard([]);
    expect(store.getState().agentBoardState).toEqual({});
  });

  it("normalizes seeded agent statuses from backend enum values", () => {
    store.getState().seedAgentBoard([
      {
        id: "agent-1",
        name: "Researcher",
        role: "specialist",
        status: "RUNNING",
      },
      {
        id: "agent-2",
        name: "QA",
        role: "specialist",
        status: "COMPLETED",
      },
    ]);

    expect(store.getState().agentBoardState["agent-1"]?.status).toBe("running");
    expect(store.getState().agentBoardState["agent-2"]?.status).toBe(
      "completed"
    );
  });
});

describe("applyEventToAgentBoard", () => {
  it("sets agent to running on run.started", () => {
    const event = createEvent({
      eventType: "run.started",
      payload: { agentId: "agent-1" },
      agentName: "Researcher",
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]?.status).toBe("running");
    expect(board["agent-1"]?.agentName).toBe("Researcher");
  });

  it("sets agent to completed on run.completed", () => {
    const initial = {
      "agent-1": {
        agentId: "agent-1",
        agentName: "Researcher",
        role: "",
        status: "running" as const,
        stepsCompleted: 2,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
    };

    const event = createEvent({
      eventType: "run.completed",
      payload: { agentId: "agent-1" },
    });

    const board = applyEventToAgentBoard(initial, event);

    expect(board["agent-1"]?.status).toBe("completed");
    expect(board["agent-1"]?.stepsCompleted).toBe(3);
  });

  it("sets agent to failed on run.failed", () => {
    const event = createEvent({
      eventType: "run.failed",
      payload: { agentId: "agent-1" },
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]?.status).toBe("failed");
  });

  it("sets agent to running on tool.started", () => {
    const event = createEvent({
      eventType: "tool.started",
      payload: { agentId: "agent-1" },
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]?.status).toBe("running");
  });

  it("returns board unchanged for unknown event types", () => {
    const event = createEvent({
      eventType: "unknown.event",
      payload: { agentId: "agent-1" },
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]).toBeUndefined();
  });

  it("returns board unchanged when no agentId in payload", () => {
    const event = createEvent({ eventType: "run.started", payload: {} });
    const initial = {
      "agent-1": {
        agentId: "agent-1",
        agentName: "R",
        role: "",
        status: "idle" as const,
        stepsCompleted: 0,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
    };

    const board = applyEventToAgentBoard(initial, event);

    expect(board).toBe(initial);
  });

  it("captures role from agent_dispatched payload", () => {
    const event = createEvent({
      eventType: "agent_dispatched",
      payload: { agentId: "agent-1", role: "coordinator" },
      agentName: "Lead",
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]?.role).toBe("coordinator");
    expect(board["agent-1"]?.status).toBe("running");
  });

  it("captures role from run.started payload", () => {
    const event = createEvent({
      eventType: "run.started",
      payload: { agentId: "agent-1", role: "specialist" },
      agentName: "Worker",
    });

    const board = applyEventToAgentBoard({}, event);

    expect(board["agent-1"]?.role).toBe("specialist");
  });

  it("preserves existing role when event payload has no role", () => {
    const initial = {
      "agent-1": {
        agentId: "agent-1",
        agentName: "Lead",
        role: "coordinator",
        status: "idle" as const,
        stepsCompleted: 0,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
    };

    const event = createEvent({
      eventType: "run.started",
      payload: { agentId: "agent-1" },
    });

    const board = applyEventToAgentBoard(initial, event);

    expect(board["agent-1"]?.role).toBe("coordinator");
  });

  it("uses agentName fallback when event payload has no agentId", () => {
    const initial = {
      "agent-1": {
        agentId: "agent-1",
        agentName: "Researcher",
        role: "specialist",
        status: "running" as const,
        stepsCompleted: 1,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
    };

    const event = createEvent({
      eventType: "run.completed",
      payload: {},
      agentName: "Researcher",
    });

    const board = applyEventToAgentBoard(initial, event);

    expect(board["agent-1"]?.status).toBe("completed");
    expect(board["agent-1"]?.stepsCompleted).toBe(2);
  });

  it("settles running agents when mission reaches terminal completion", () => {
    const initial = {
      "agent-1": {
        agentId: "agent-1",
        agentName: "Lead",
        role: "coordinator",
        status: "running" as const,
        stepsCompleted: 0,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
      "agent-2": {
        agentId: "agent-2",
        agentName: "Specialist",
        role: "specialist",
        status: "blocked" as const,
        stepsCompleted: 0,
        tokensUsed: 0,
        costCents: 0,
        recentToolCalls: [],
      },
    };

    const board = applyEventToAgentBoard(
      initial,
      createEvent({
        eventType: "orchestrator_completed",
        summary: "Mission completed",
        timestamp: 5000,
      })
    );

    expect(board["agent-1"]?.status).toBe("completed");
    expect(board["agent-2"]?.status).toBe("completed");
    expect(board["agent-1"]?.lastActivityAt).toBe(5000);
    expect(board["agent-2"]?.lastActivityAt).toBe(5000);
  });
});

describe("applyEventToApprovals", () => {
  it("adds approval on approval.requested", () => {
    const event = createEvent({
      eventType: "approval.requested",
      payload: {
        approvalId: "appr-1",
        intent: "deploy to production",
        riskLevel: "high",
      },
      agentName: "Deployer",
      missionId: "mission-1",
      runId: "run-1",
    });

    const queue = applyEventToApprovals([], event);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.approvalId).toBe("appr-1");
    expect(queue[0]?.agentName).toBe("Deployer");
    expect(queue[0]?.actionIntent).toBe("deploy to production");
    expect(queue[0]?.riskLevel).toBe("high");
    expect(queue[0]?.status).toBe("pending");
    expect(queue[0]?.missionId).toBe("mission-1");
    expect(queue[0]?.runId).toBe("run-1");
  });

  it("resolves approval as approved on approval.resolved with approved=true", () => {
    const initial = [
      {
        approvalId: "appr-1",
        missionId: "mission-1",
        runId: "run-1",
        agentName: "Deployer",
        actionIntent: "deploy",
        riskLevel: "high" as const,
        status: "pending" as const,
        requestedAt: 1000,
      },
    ];

    const event = createEvent({
      eventType: "approval.resolved",
      payload: {
        approvalId: "appr-1",
        approved: true,
        resolvedById: "user-1",
        reason: "Looks good",
      },
      timestamp: 2000,
    });

    const queue = applyEventToApprovals(initial, event);

    expect(queue[0]?.status).toBe("approved");
    expect(queue[0]?.resolvedAt).toBe(2000);
    expect(queue[0]?.resolvedById).toBe("user-1");
    expect(queue[0]?.reason).toBe("Looks good");
  });

  it("resolves approval as rejected on approval.resolved with approved=false", () => {
    const initial = [
      {
        approvalId: "appr-1",
        missionId: "mission-1",
        runId: "run-1",
        agentName: "Deployer",
        actionIntent: "deploy",
        riskLevel: "critical" as const,
        status: "pending" as const,
        requestedAt: 1000,
      },
    ];

    const event = createEvent({
      eventType: "approval.resolved",
      payload: { approvalId: "appr-1", approved: false },
    });

    const queue = applyEventToApprovals(initial, event);

    expect(queue[0]?.status).toBe("rejected");
  });

  it("returns queue unchanged for unrelated event types", () => {
    const event = createEvent({ eventType: "run.started" });
    const initial = [
      {
        approvalId: "appr-1",
        missionId: "mission-1",
        runId: "run-1",
        agentName: "A",
        actionIntent: "x",
        riskLevel: "low" as const,
        status: "pending" as const,
        requestedAt: 1000,
      },
    ];

    const queue = applyEventToApprovals(initial, event);

    expect(queue).toEqual(initial);
  });
});

describe("applyEventToBudget", () => {
  const initialBudget = {
    consumedCents: 0,
    budgetCents: 0,
    burnRateCentsPerMinute: 0,
    perAgentCosts: {},
  };

  it("updates consumedCents and perAgentCosts on cost.updated", () => {
    const event = createEvent({
      eventType: "cost.updated",
      payload: {
        consumedCents: 250,
        agentId: "agent-1",
        costCents: 120,
        burnRateCentsPerMinute: 5,
      },
    });

    const budget = applyEventToBudget(initialBudget, event);

    expect(budget.consumedCents).toBe(250);
    expect(budget.perAgentCosts["agent-1"]).toBe(120);
    expect(budget.burnRateCentsPerMinute).toBe(5);
  });

  it("preserves existing values when cost.updated has partial payload", () => {
    const existing = {
      consumedCents: 100,
      budgetCents: 1000,
      burnRateCentsPerMinute: 3,
      perAgentCosts: { "agent-1": 50 },
    };

    const event = createEvent({
      eventType: "cost.updated",
      payload: { consumedCents: 200 },
    });

    const budget = applyEventToBudget(existing, event);

    expect(budget.consumedCents).toBe(200);
    expect(budget.burnRateCentsPerMinute).toBe(3);
    expect(budget.perAgentCosts).toEqual({ "agent-1": 50 });
  });

  it("updates budgetCents on budget.set", () => {
    const event = createEvent({
      eventType: "budget.set",
      payload: { budgetCents: 5000 },
    });

    const budget = applyEventToBudget(initialBudget, event);

    expect(budget.budgetCents).toBe(5000);
    expect(budget.consumedCents).toBe(0);
  });

  it("returns budget unchanged for unrelated event types", () => {
    const event = createEvent({ eventType: "run.started" });

    const budget = applyEventToBudget(initialBudget, event);

    expect(budget).toBe(initialBudget);
  });
});
