import { beforeEach, describe, expect, it } from "bun:test";
import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
} from "@openplane/types/mission-control";
import {
  applyEventToAgentBoard,
  applyEventToApprovals,
  applyEventToBudget,
  buildAgentNameIndex,
  resolveEventAgentId,
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

function createBoardAgent(
  overrides: Partial<MissionAgentLaneState> = {}
): MissionAgentLaneState {
  return {
    agentId: "agent-1",
    agentName: "Agent",
    role: "",
    status: "idle",
    stepsCompleted: 0,
    tokensUsed: 0,
    costCents: 0,
    recentToolCalls: [],
    replanCount: 0,
    isReflecting: false,
    spawnDepth: 0,
    crossMissionLinks: [],
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
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
        status: "running",
        stepsCompleted: 2,
      }),
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
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "R",
      }),
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
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Lead",
        role: "coordinator",
      }),
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
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
        role: "specialist",
        status: "running",
        stepsCompleted: 1,
      }),
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
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Lead",
        role: "coordinator",
        status: "running",
      }),
      "agent-2": createBoardAgent({
        agentId: "agent-2",
        agentName: "Specialist",
        role: "specialist",
        status: "blocked",
      }),
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

describe("memory eviction", () => {
  let store: typeof import("../mission-runtime-store").useMissionRuntimeStore;

  beforeEach(async () => {
    const mod = await import("../mission-runtime-store");
    store = mod.useMissionRuntimeStore;
    store.getState().resetAll();
  });

  it("keeps only last 5000 events when ingesting more", () => {
    const events = Array.from({ length: 6000 }, (_, i) =>
      createEvent({
        sequence: i + 1,
        timestamp: 1000 + i,
        eventType: "agent_step_completed",
        payload: { agentId: "agent-1", step: i + 1 },
        agentName: "Test",
      })
    );

    store.getState().ingestBatch("run-1", events);

    const stored = store.getState().eventsByRun["run-1"] ?? [];
    expect(stored.length).toBe(5000);
    expect(stored[0].sequence).toBe(1001);
    expect(stored.at(-1)?.sequence).toBe(6000);
  });

  it("sets evictionCursor to last evicted event sequence", () => {
    const events = Array.from({ length: 6000 }, (_, i) =>
      createEvent({
        sequence: i + 1,
        timestamp: 1000 + i,
        eventType: "agent_step_completed",
        payload: { agentId: "agent-1", step: i + 1 },
        agentName: "Test",
      })
    );

    store.getState().ingestBatch("run-1", events);

    expect(store.getState().evictionCursor["run-1"]).toBe(1000);
  });

  it("does not evict when under limit", () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      createEvent({
        sequence: i + 1,
        timestamp: 1000 + i,
      })
    );

    store.getState().ingestBatch("run-1", events);

    expect(store.getState().eventsByRun["run-1"]?.length).toBe(100);
    expect(store.getState().evictionCursor["run-1"] ?? 0).toBe(0);
  });

  it("preserves derived state after eviction", () => {
    const events: MissionEventLedgerItem[] = [
      createEvent({
        sequence: 1,
        timestamp: 1000,
        eventType: "budget.set",
        payload: { budgetCents: 5000 },
      }),
      createEvent({
        sequence: 2,
        timestamp: 1001,
        eventType: "cost.updated",
        payload: { consumedCents: 100, agentId: "agent-1", costCents: 100 },
      }),
      ...Array.from({ length: 5500 }, (_, i) =>
        createEvent({
          sequence: i + 3,
          timestamp: 1002 + i,
          eventType: "agent_step_completed",
          payload: { agentId: "agent-1", step: i + 1 },
          agentName: "Test",
        })
      ),
    ];

    store.getState().ingestBatch("run-1", events);

    expect(store.getState().budgetState.budgetCents).toBe(5000);
    expect(store.getState().budgetState.consumedCents).toBe(100);
    expect(store.getState().eventsByRun["run-1"]?.length).toBe(5000);
  });

  it("reset clears evictionCursor for the run", () => {
    const events = Array.from({ length: 6000 }, (_, i) =>
      createEvent({
        sequence: i + 1,
        timestamp: 1000 + i,
      })
    );

    store.getState().ingestBatch("run-1", events);
    expect(store.getState().evictionCursor["run-1"]).toBe(1000);

    store.getState().reset("run-1");
    expect(store.getState().evictionCursor["run-1"]).toBeUndefined();
  });

  it("useEvictionCursor returns 0 for unknown runs", () => {
    expect(store.getState().evictionCursor["unknown-run"] ?? 0).toBe(0);
  });

  it("subsequent ingestBatch calls accumulate eviction correctly", () => {
    const batch1 = Array.from({ length: 4000 }, (_, i) =>
      createEvent({
        sequence: i + 1,
        timestamp: 1000 + i,
        eventType: "agent_step_completed",
        payload: { agentId: "agent-1" },
        agentName: "Test",
      })
    );

    store.getState().ingestBatch("run-1", batch1);
    expect(store.getState().eventsByRun["run-1"]?.length).toBe(4000);

    const batch2 = Array.from({ length: 2000 }, (_, i) =>
      createEvent({
        sequence: i + 4001,
        timestamp: 5000 + i,
        eventType: "agent_step_completed",
        payload: { agentId: "agent-1" },
        agentName: "Test",
      })
    );

    store.getState().ingestBatch("run-1", batch2);
    expect(store.getState().eventsByRun["run-1"]?.length).toBe(5000);
    expect(store.getState().evictionCursor["run-1"]).toBe(1000);
  });
});

describe("buildAgentNameIndex", () => {
  it("maps normalized agent names to IDs", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
      }),
      "agent-2": createBoardAgent({
        agentId: "agent-2",
        agentName: "Code Writer",
      }),
    };

    const index = buildAgentNameIndex(board);

    expect(index.researcher).toBe("agent-1");
    expect(index["code writer"]).toBe("agent-2");
  });

  it("returns empty object for empty board", () => {
    const index = buildAgentNameIndex({});
    expect(Object.keys(index)).toHaveLength(0);
  });

  it("trims whitespace in agent names", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "  Researcher  ",
      }),
    };

    const index = buildAgentNameIndex(board);

    expect(index.researcher).toBe("agent-1");
  });
});

describe("resolveEventAgentId", () => {
  it("returns payload agentId when present", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
      }),
    };
    const event = createEvent({ payload: { agentId: "agent-1" } });

    const result = resolveEventAgentId(board, event);

    expect(result).toBe("agent-1");
  });

  it("uses name index for O(1) lookup when provided", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
      }),
      "agent-2": createBoardAgent({
        agentId: "agent-2",
        agentName: "Writer",
      }),
    };
    const nameIndex = buildAgentNameIndex(board);
    const event = createEvent({
      agentName: "Researcher",
      payload: {},
    });

    const result = resolveEventAgentId(board, event, nameIndex);

    expect(result).toBe("agent-1");
  });

  it("falls back to linear scan when no index provided", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
      }),
    };
    const event = createEvent({
      agentName: "Researcher",
      payload: {},
    });

    const result = resolveEventAgentId(board, event);

    expect(result).toBe("agent-1");
  });

  it("returns undefined for unknown agent name", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Researcher",
      }),
    };
    const nameIndex = buildAgentNameIndex(board);
    const event = createEvent({
      agentName: "NonExistent",
      payload: {},
    });

    const result = resolveEventAgentId(board, event, nameIndex);

    expect(result).toBeUndefined();
  });

  it("handles case-insensitive matching", () => {
    const board: Record<string, MissionAgentLaneState> = {
      "agent-1": createBoardAgent({
        agentId: "agent-1",
        agentName: "Code Writer",
      }),
    };
    const nameIndex = buildAgentNameIndex(board);
    const event = createEvent({
      agentName: "CODE WRITER",
      payload: {},
    });

    const result = resolveEventAgentId(board, event, nameIndex);

    expect(result).toBe("agent-1");
  });
});

describe("agentNameIndex in store", () => {
  let store: typeof import("../mission-runtime-store").useMissionRuntimeStore;

  beforeEach(async () => {
    const mod = await import("../mission-runtime-store");
    store = mod.useMissionRuntimeStore;
    store.getState().resetAll();
  });

  it("seedAgentBoard populates the name index", () => {
    store.getState().seedAgentBoard([
      { id: "agent-1", name: "Researcher", role: "research", status: "idle" },
      { id: "agent-2", name: "Writer", role: "writing", status: "idle" },
    ]);

    const nameIndex = store.getState().agentNameIndex;
    expect(nameIndex.researcher).toBe("agent-1");
    expect(nameIndex.writer).toBe("agent-2");
  });

  it("ingestBatch updates index when spawn events add agents", () => {
    store.getState().seedAgentBoard([
      {
        id: "agent-1",
        name: "Coordinator",
        role: "coord",
        status: "running",
      },
    ]);

    const spawnEvent = createEvent({
      sequence: 1,
      eventType: "agent.spawned",
      payload: {
        childAgentId: "spawned-1",
        childAgentName: "Deep Researcher",
        parentAgentId: "agent-1",
        spawnDepth: 1,
      },
      agentName: "Deep Researcher",
    });

    store.getState().ingestBatch("run-1", [spawnEvent]);

    const nameIndex = store.getState().agentNameIndex;
    expect(nameIndex.coordinator).toBe("agent-1");
    expect(nameIndex["deep researcher"]).toBe("spawned-1");
  });

  it("name index enables lookup for subsequent events", () => {
    store
      .getState()
      .seedAgentBoard([
        { id: "agent-1", name: "Researcher", role: "research", status: "idle" },
      ]);

    const events = [
      createEvent({
        sequence: 1,
        eventType: "run.started",
        agentName: "Researcher",
        payload: {},
      }),
      createEvent({
        sequence: 2,
        eventType: "tool.started",
        agentName: "Researcher",
        payload: { toolName: "search", toolCallId: "tc-1" },
      }),
    ];

    store.getState().ingestBatch("run-1", events);

    const board = store.getState().agentBoardState;
    expect(board["agent-1"]?.status).toBe("running");
    expect(board["agent-1"]?.recentToolCalls).toHaveLength(1);
  });
});

describe("granular selectors", () => {
  let mod: typeof import("../mission-runtime-store");
  let store: typeof import("../mission-runtime-store").useMissionRuntimeStore;

  beforeEach(async () => {
    mod = await import("../mission-runtime-store");
    store = mod.useMissionRuntimeStore;
    store.getState().resetAll();
  });

  it("useAgentLane returns single agent state", () => {
    store.getState().seedAgentBoard([
      {
        id: "agent-1",
        name: "Researcher",
        role: "research",
        status: "running",
      },
      { id: "agent-2", name: "Writer", role: "writing", status: "idle" },
    ]);

    const lane = store.getState().agentBoardState["agent-1"];
    expect(lane?.agentName).toBe("Researcher");
    expect(lane?.status).toBe("running");
  });

  it("useAgentLane returns undefined for missing agent", () => {
    const lane = store.getState().agentBoardState.nonexistent;
    expect(lane).toBeUndefined();
  });

  it("useAgentName returns agent name by ID", () => {
    store
      .getState()
      .seedAgentBoard([
        { id: "agent-1", name: "Researcher", role: "research", status: "idle" },
      ]);

    const name = store.getState().agentBoardState["agent-1"]?.agentName ?? null;
    expect(name).toBe("Researcher");
  });

  it("useAgentName returns null for null agentId", () => {
    const agentId: string | null = null;
    const name = agentId
      ? (store.getState().agentBoardState[agentId]?.agentName ?? null)
      : null;
    expect(name).toBeNull();
  });

  it("useAgentName returns null for unknown agentId", () => {
    const name = store.getState().agentBoardState.unknown?.agentName ?? null;
    expect(name).toBeNull();
  });

  it("useAgentStatusCounts aggregates statuses correctly", () => {
    store.getState().seedAgentBoard([
      { id: "a1", name: "A1", role: "r", status: "running" },
      { id: "a2", name: "A2", role: "r", status: "running" },
      { id: "a3", name: "A3", role: "r", status: "blocked" },
      { id: "a4", name: "A4", role: "r", status: "completed" },
      { id: "a5", name: "A5", role: "r", status: "failed" },
      { id: "a6", name: "A6", role: "r", status: "idle" },
    ]);

    const board = store.getState().agentBoardState;
    const agents = Object.values(board);
    const total = agents.length;
    const running = agents.filter((a) => a.status === "running").length;
    const blocked = agents.filter((a) => a.status === "blocked").length;
    const completed = agents.filter((a) => a.status === "completed").length;
    const failed = agents.filter((a) => a.status === "failed").length;

    expect(total).toBe(6);
    expect(running).toBe(2);
    expect(blocked).toBe(1);
    expect(completed).toBe(1);
    expect(failed).toBe(1);
    expect(running + blocked).toBe(3);
  });

  it("useAgentStatusCounts returns zeros for empty board", () => {
    const board = store.getState().agentBoardState;
    expect(Object.keys(board)).toHaveLength(0);
  });

  it("useRunningAgentCount returns only running agents", () => {
    store.getState().seedAgentBoard([
      { id: "a1", name: "A1", role: "r", status: "running" },
      { id: "a2", name: "A2", role: "r", status: "completed" },
      { id: "a3", name: "A3", role: "r", status: "running" },
      { id: "a4", name: "A4", role: "r", status: "idle" },
    ]);

    const board = store.getState().agentBoardState;
    const count = Object.values(board).filter(
      (a) => a.status === "running"
    ).length;

    expect(count).toBe(2);
  });

  it("useAgentNameMap returns name/role map", () => {
    store.getState().seedAgentBoard([
      { id: "a1", name: "Researcher", role: "research", status: "idle" },
      { id: "a2", name: "Writer", role: "writing", status: "running" },
    ]);

    const board = store.getState().agentBoardState;
    const nameMap: Record<string, { agentName: string; role?: string }> = {};
    for (const [id, lane] of Object.entries(board)) {
      nameMap[id] = { agentName: lane.agentName, role: lane.role };
    }

    expect(nameMap.a1?.agentName).toBe("Researcher");
    expect(nameMap.a1?.role).toBe("research");
    expect(nameMap.a2?.agentName).toBe("Writer");
    expect(nameMap.a2?.role).toBe("writing");
  });

  it("useAgentNameMap excludes status and cost fields", () => {
    store
      .getState()
      .seedAgentBoard([
        { id: "a1", name: "Researcher", role: "research", status: "running" },
      ]);

    store.getState().ingestEvent(
      "run-1",
      createEvent({
        sequence: 1,
        eventType: "cost.updated",
        payload: { consumedCents: 100, agentId: "a1", costCents: 100 },
      })
    );

    const board = store.getState().agentBoardState;
    const nameMap: Record<string, { agentName: string; role?: string }> = {};
    for (const [id, lane] of Object.entries(board)) {
      nameMap[id] = { agentName: lane.agentName, role: lane.role };
    }

    const entry = nameMap.a1;
    expect(entry).toBeDefined();
    expect(Object.keys(entry ?? {})).toEqual(["agentName", "role"]);
  });
});
