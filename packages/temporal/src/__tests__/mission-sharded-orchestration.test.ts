import {
  HISTORY_EVENT_THRESHOLD,
  MissionOrchestratorInputSchema,
  SHARD_THRESHOLD,
  SubOrchestratorInputSchema,
  SubOrchestratorOutputSchema,
} from "@openplane/types/temporal/mission";
import { describe, expect, it } from "vitest";

describe("sharded orchestration constants", () => {
  it("SHARD_THRESHOLD is 50", () => {
    expect(SHARD_THRESHOLD).toBe(50);
  });

  it("HISTORY_EVENT_THRESHOLD is 30000", () => {
    expect(HISTORY_EVENT_THRESHOLD).toBe(30_000);
  });
});

describe("SubOrchestratorInputSchema", () => {
  it("parses valid input", () => {
    const result = SubOrchestratorInputSchema.parse({
      missionId: "m-1",
      teamId: "t-1",
      shardId: "shard-1",
      parentWorkflowId: "mission-orch:m-1",
    });

    expect(result.missionId).toBe("m-1");
    expect(result.shardId).toBe("shard-1");
    expect(result.parentWorkflowId).toBe("mission-orch:m-1");
  });

  it("rejects missing shardId", () => {
    expect(() =>
      SubOrchestratorInputSchema.parse({
        missionId: "m-1",
        teamId: "t-1",
        parentWorkflowId: "orch-1",
      })
    ).toThrow();
  });

  it("rejects missing parentWorkflowId", () => {
    expect(() =>
      SubOrchestratorInputSchema.parse({
        missionId: "m-1",
        teamId: "t-1",
        shardId: "shard-1",
      })
    ).toThrow();
  });
});

describe("SubOrchestratorOutputSchema", () => {
  it("parses completed output", () => {
    const result = SubOrchestratorOutputSchema.parse({
      shardId: "shard-1",
      processedAgents: 42,
      status: "completed",
    });

    expect(result.shardId).toBe("shard-1");
    expect(result.processedAgents).toBe(42);
    expect(result.status).toBe("completed");
  });

  it("parses cancelled output", () => {
    const result = SubOrchestratorOutputSchema.parse({
      shardId: "shard-2",
      processedAgents: 10,
      status: "cancelled",
    });

    expect(result.status).toBe("cancelled");
  });

  it("rejects invalid status", () => {
    expect(() =>
      SubOrchestratorOutputSchema.parse({
        shardId: "shard-1",
        processedAgents: 0,
        status: "failed",
      })
    ).toThrow();
  });
});

describe("MissionOrchestratorInputSchema checkpoint", () => {
  it("supports checkpoint with spawn and message state", () => {
    const result = MissionOrchestratorInputSchema.parse({
      missionId: "m-1",
      teamId: "t-1",
      objective: "Test mission",
      checkpoint: {
        dispatchedRuns: 100,
        completedTasks: 80,
        consumedCents: 5000,
        spawnedAgentCount: 60,
        pendingMessages: [],
        crossMissionEvents: [],
      },
    });

    expect(result.checkpoint?.dispatchedRuns).toBe(100);
    expect(result.checkpoint?.spawnedAgentCount).toBe(60);
  });
});

describe("shard dispatch flow (unit logic)", () => {
  it("shard map correctly associates agents to shards", () => {
    const shardMap = new Map<string, string>();
    const activeShards = new Map<string, number>();

    const shardWorkflowId = "mission-shard:m-1:shard-1";
    activeShards.set(shardWorkflowId, 0);

    for (let i = 0; i < 10; i++) {
      const agentId = `agent-${i}`;
      shardMap.set(agentId, shardWorkflowId);
      activeShards.set(
        shardWorkflowId,
        (activeShards.get(shardWorkflowId) ?? 0) + 1
      );
    }

    expect(shardMap.size).toBe(10);
    expect(activeShards.get(shardWorkflowId)).toBe(10);

    for (let i = 0; i < 10; i++) {
      expect(shardMap.get(`agent-${i}`)).toBe(shardWorkflowId);
    }
  });

  it("agent completion removes from shard map", () => {
    const shardMap = new Map<string, string>();
    const activeShards = new Map<string, number>();
    const shardId = "mission-shard:m-1:shard-1";

    shardMap.set("agent-1", shardId);
    shardMap.set("agent-2", shardId);
    activeShards.set(shardId, 2);

    shardMap.delete("agent-1");
    const count = activeShards.get(shardId) ?? 1;
    if (count <= 1) {
      activeShards.delete(shardId);
    } else {
      activeShards.set(shardId, count - 1);
    }

    expect(shardMap.size).toBe(1);
    expect(shardMap.has("agent-1")).toBe(false);
    expect(activeShards.get(shardId)).toBe(1);
  });

  it("shard is removed when last agent completes", () => {
    const shardMap = new Map<string, string>();
    const activeShards = new Map<string, number>();
    const shardId = "mission-shard:m-1:shard-1";

    shardMap.set("agent-1", shardId);
    activeShards.set(shardId, 1);

    shardMap.delete("agent-1");
    const count = activeShards.get(shardId) ?? 1;
    if (count <= 1) {
      activeShards.delete(shardId);
    } else {
      activeShards.set(shardId, count - 1);
    }

    expect(shardMap.size).toBe(0);
    expect(activeShards.size).toBe(0);
  });

  it("message routing forwards to correct shard", () => {
    const shardMap = new Map<string, string>();
    shardMap.set("agent-1", "shard-A");
    shardMap.set("agent-2", "shard-B");
    shardMap.set("agent-3", "shard-A");

    expect(shardMap.get("agent-1")).toBe("shard-A");
    expect(shardMap.get("agent-2")).toBe("shard-B");
    expect(shardMap.get("agent-3")).toBe("shard-A");

    expect(shardMap.get("agent-unknown")).toBeUndefined();
  });

  it("budget aggregates correctly across shards", () => {
    let consumedCents = 0;
    const completions = [
      { agentId: "agent-1", costCents: 50 },
      { agentId: "agent-2", costCents: 75 },
      { agentId: "agent-3", costCents: 30 },
    ];

    for (const c of completions) {
      consumedCents += c.costCents;
    }

    expect(consumedCents).toBe(155);
  });
});

describe("shard capacity management", () => {
  it("creates new shard when existing ones are full", () => {
    const activeShards = new Map<string, number>();
    let shardCounter = 1;

    activeShards.set("shard-1", SHARD_THRESHOLD);

    let targetShard: string | null = null;
    for (const [shardId, agentCount] of activeShards) {
      if (agentCount < SHARD_THRESHOLD) {
        targetShard = shardId;
        break;
      }
    }

    if (!targetShard) {
      shardCounter += 1;
      targetShard = `shard-${shardCounter}`;
      activeShards.set(targetShard, 1);
    }

    expect(targetShard).toBe("shard-2");
    expect(shardCounter).toBe(2);
    expect(activeShards.size).toBe(2);
  });

  it("reuses shard with available capacity", () => {
    const activeShards = new Map<string, number>();
    activeShards.set("shard-1", 30);

    let targetShard: string | null = null;
    for (const [shardId, agentCount] of activeShards) {
      if (agentCount < SHARD_THRESHOLD) {
        targetShard = shardId;
        break;
      }
    }

    expect(targetShard).toBe("shard-1");
  });

  it("distributes agents across multiple shards for 500-agent mission", () => {
    const activeShards = new Map<string, number>();
    let shardCounter = 0;
    const shardMap = new Map<string, string>();

    for (let i = 0; i < 500; i++) {
      let targetShard: string | null = null;
      for (const [shardId, count] of activeShards) {
        if (count < SHARD_THRESHOLD) {
          targetShard = shardId;
          break;
        }
      }

      if (!targetShard) {
        shardCounter += 1;
        targetShard = `shard-${shardCounter}`;
        activeShards.set(targetShard, 0);
      }

      activeShards.set(targetShard, (activeShards.get(targetShard) ?? 0) + 1);
      shardMap.set(`agent-${i}`, targetShard);
    }

    expect(shardCounter).toBe(10);
    expect(shardMap.size).toBe(500);

    for (const [, count] of activeShards) {
      expect(count).toBe(SHARD_THRESHOLD);
    }
  });
});
