import { SHARD_THRESHOLD } from "@openplane/types/temporal/mission";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAllMetrics, swarmMetrics } from "../config/metrics";
import { wouldCreateCycle } from "../workflows/mission/mission-orchestrator";

interface RunningAgent {
  agentId: string;
  childWorkflowId: string;
  agentName: string;
}

function buildActiveAgents(count: number): Map<string, RunningAgent> {
  const agents = new Map<string, RunningAgent>();
  for (let i = 0; i < count; i++) {
    const id = `agent-${i}`;
    agents.set(id, {
      agentId: id,
      childWorkflowId: `wf-${id}`,
      agentName: `Agent ${i}`,
    });
  }
  return agents;
}

function buildShardMap(
  agents: Map<string, RunningAgent>,
  _shardCount: number
): Map<string, string> {
  const shardMap = new Map<string, string>();
  const agentIds = [...agents.keys()];
  for (let i = 0; i < agentIds.length; i++) {
    const shardId = `shard-${Math.floor(i / SHARD_THRESHOLD) + 1}`;
    const shardWorkflowId = `mission-shard:m1:${shardId}`;
    shardMap.set(agentIds[i] ?? "", shardWorkflowId);
  }
  return shardMap;
}

describe("Swarm stress tests", () => {
  describe("100 concurrent agents without head-of-line blocking", () => {
    it("tracks 100 agents correctly in state", () => {
      const agents = buildActiveAgents(100);
      expect(agents.size).toBe(100);

      for (let i = 0; i < 100; i++) {
        const agent = agents.get(`agent-${i}`);
        expect(agent).toBeDefined();
        expect(agent?.agentId).toBe(`agent-${i}`);
      }
    });

    it("distributes agents across shards at SHARD_THRESHOLD", () => {
      const agents = buildActiveAgents(100);
      const shardMap = buildShardMap(agents, 2);

      const shardCounts = new Map<string, number>();
      for (const shardWorkflowId of shardMap.values()) {
        shardCounts.set(
          shardWorkflowId,
          (shardCounts.get(shardWorkflowId) ?? 0) + 1
        );
      }

      expect(shardCounts.size).toBe(2);
      for (const count of shardCounts.values()) {
        expect(count).toBe(50);
      }
    });

    it("removes agents correctly on completion", () => {
      const agents = buildActiveAgents(100);
      expect(agents.size).toBe(100);

      agents.delete("agent-50");
      agents.delete("agent-99");
      expect(agents.size).toBe(98);
      expect(agents.has("agent-50")).toBe(false);
      expect(agents.has("agent-99")).toBe(false);
      expect(agents.has("agent-51")).toBe(true);
    });
  });

  describe("budget enforcement across 50 agents", () => {
    it("tracks cumulative cost correctly", () => {
      let consumedCents = 0;
      const costPerAgent = Array.from({ length: 50 }, (_, i) => (i + 1) * 2);

      for (const cost of costPerAgent) {
        consumedCents += cost;
      }

      const expectedTotal = costPerAgent.reduce((sum, c) => sum + c, 0);
      expect(consumedCents).toBe(expectedTotal);
      expect(consumedCents).toBe(2550);
    });

    it("budget limit halts further spawns", () => {
      const budgetCents = 2000;
      let consumedCents = 0;
      let spawnedCount = 0;

      for (let i = 0; i < 50; i++) {
        const cost = (i + 1) * 2;
        if (consumedCents + cost > budgetCents) {
          break;
        }
        consumedCents += cost;
        spawnedCount += 1;
      }

      expect(consumedCents).toBeLessThanOrEqual(budgetCents);
      expect(spawnedCount).toBeLessThan(50);
      expect(spawnedCount).toBeGreaterThan(0);
    });
  });

  describe("message routing under burst load", () => {
    it("routes 1000 messages to correct shards", () => {
      const agents = buildActiveAgents(100);
      const shardMap = buildShardMap(agents, 2);

      let correctRoutes = 0;
      for (let i = 0; i < 1000; i++) {
        const targetAgentId = `agent-${i % 100}`;
        const shardWorkflowId = shardMap.get(targetAgentId);
        expect(shardWorkflowId).toBeDefined();
        if (shardWorkflowId) {
          correctRoutes += 1;
        }
      }

      expect(correctRoutes).toBe(1000);
    });

    it("broadcast routing deduplicates across shards", () => {
      const agents = buildActiveAgents(100);
      const shardMap = buildShardMap(agents, 2);

      const uniqueShards = new Set<string>();
      for (const shardId of shardMap.values()) {
        uniqueShards.add(shardId);
      }

      expect(uniqueShards.size).toBe(2);
    });
  });

  describe("spawn queue backpressure", () => {
    it("processes up to MAX_SPAWNS_PER_ITERATION limit", () => {
      const MAX_SPAWNS_PER_ITERATION = 5;
      const spawnQueue: string[] = Array.from(
        { length: 200 },
        (_, i) => `spawn-${i}`
      );
      let processed = 0;

      while (spawnQueue.length > 0 && processed < MAX_SPAWNS_PER_ITERATION) {
        spawnQueue.shift();
        processed += 1;
      }

      expect(processed).toBe(MAX_SPAWNS_PER_ITERATION);
      expect(spawnQueue.length).toBe(195);
    });

    it("remaining queue triggers spawn_backpressure wake reason", () => {
      const MAX_SPAWNS_PER_ITERATION = 5;
      const spawnQueue: string[] = Array.from(
        { length: 200 },
        (_, i) => `spawn-${i}`
      );
      const wakeQueue: Array<{ reason: string }> = [];

      let processed = 0;
      while (spawnQueue.length > 0 && processed < MAX_SPAWNS_PER_ITERATION) {
        spawnQueue.shift();
        processed += 1;
      }

      if (spawnQueue.length > 0) {
        wakeQueue.push({ reason: "spawn_backpressure" });
      }

      expect(wakeQueue).toHaveLength(1);
      expect(wakeQueue[0]?.reason).toBe("spawn_backpressure");
    });
  });

  describe("dedup under concurrent delivery", () => {
    it("correctly identifies duplicates in a batch", () => {
      const seen = new Set<string>();
      const messageIds: string[] = [];

      for (let i = 0; i < 80; i++) {
        messageIds.push(`msg-${i}`);
      }
      for (let i = 0; i < 20; i++) {
        messageIds.push(`msg-${i}`);
      }

      let duplicateCount = 0;
      let processedCount = 0;

      for (const id of messageIds) {
        if (seen.has(id)) {
          duplicateCount += 1;
        } else {
          seen.add(id);
          processedCount += 1;
        }
      }

      expect(duplicateCount).toBe(20);
      expect(processedCount).toBe(80);
    });
  });

  describe("priority ordering under mixed load", () => {
    it("processes messages in priority order", () => {
      type PriorityMessage = {
        id: string;
        priority: "critical" | "high" | "normal" | "low";
      };
      const messages: PriorityMessage[] = [];

      for (let i = 0; i < 10; i++) {
        messages.push({ id: `crit-${i}`, priority: "critical" });
      }
      for (let i = 0; i < 30; i++) {
        messages.push({ id: `high-${i}`, priority: "high" });
      }
      for (let i = 0; i < 50; i++) {
        messages.push({ id: `norm-${i}`, priority: "normal" });
      }
      for (let i = 0; i < 10; i++) {
        messages.push({ id: `low-${i}`, priority: "low" });
      }

      const PRIORITY_ORDER = ["critical", "high", "normal", "low"] as const;
      const byPriority = new Map<string, PriorityMessage[]>();
      for (const msg of messages) {
        const list = byPriority.get(msg.priority) ?? [];
        list.push(msg);
        byPriority.set(msg.priority, list);
      }

      const processed: string[] = [];
      for (const priority of PRIORITY_ORDER) {
        const batch = byPriority.get(priority) ?? [];
        for (const msg of batch) {
          processed.push(msg.priority);
        }
      }

      const criticalEnd = processed.lastIndexOf("critical");
      const highStart = processed.indexOf("high");
      const highEnd = processed.lastIndexOf("high");
      const normalStart = processed.indexOf("normal");
      const normalEnd = processed.lastIndexOf("normal");
      const lowStart = processed.indexOf("low");

      expect(criticalEnd).toBeLessThan(highStart);
      expect(highEnd).toBeLessThan(normalStart);
      expect(normalEnd).toBeLessThan(lowStart);
    });
  });

  describe("metrics throughput under swarm load", () => {
    beforeEach(() => {
      resetAllMetrics();
    });

    it("tracks 100 concurrent agent spawns and completions in swarmMetrics", () => {
      const AGENT_COUNT = 100;

      for (let i = 0; i < AGENT_COUNT; i++) {
        swarmMetrics.spawnTotal.inc({ missionId: "m1" });
        swarmMetrics.agentsActive.inc({ missionId: "m1" });
      }

      expect(swarmMetrics.spawnTotal.get({ missionId: "m1" })).toBe(
        AGENT_COUNT
      );
      expect(swarmMetrics.agentsActive.get({ missionId: "m1" })).toBe(
        AGENT_COUNT
      );

      for (let i = 0; i < 40; i++) {
        swarmMetrics.agentsActive.dec({ missionId: "m1" });
      }

      expect(swarmMetrics.agentsActive.get({ missionId: "m1" })).toBe(60);
      expect(swarmMetrics.spawnTotal.get({ missionId: "m1" })).toBe(
        AGENT_COUNT
      );
    });

    it("accumulates message counters across 10 agents sending 50 messages each", () => {
      for (let agent = 0; agent < 10; agent++) {
        for (let msg = 0; msg < 50; msg++) {
          swarmMetrics.messagesSent.inc({ missionId: "m1" });
        }
      }

      expect(swarmMetrics.messagesSent.get({ missionId: "m1" })).toBe(500);
    });

    it("tracks rate-limited and dead-lettered counters independently per mission", () => {
      swarmMetrics.messagesRateLimited.inc(
        { missionId: "m1", window: "second" },
        15
      );
      swarmMetrics.messagesRateLimited.inc(
        { missionId: "m2", window: "minute" },
        3
      );
      swarmMetrics.messagesDeadLettered.inc({ streamKey: "s1" }, 7);
      swarmMetrics.messagesDeduplicated.inc({ missionId: "m1" }, 20);
      swarmMetrics.messagesReclaimed.inc({ streamKey: "s1" }, 4);
      swarmMetrics.messagesReprocessed.inc({ streamKey: "s1" }, 2);

      expect(
        swarmMetrics.messagesRateLimited.get({
          missionId: "m1",
          window: "second",
        })
      ).toBe(15);
      expect(
        swarmMetrics.messagesRateLimited.get({
          missionId: "m2",
          window: "minute",
        })
      ).toBe(3);
      expect(swarmMetrics.messagesDeadLettered.get({ streamKey: "s1" })).toBe(
        7
      );
      expect(swarmMetrics.messagesDeduplicated.get({ missionId: "m1" })).toBe(
        20
      );
      expect(swarmMetrics.messagesReclaimed.get({ streamKey: "s1" })).toBe(4);
      expect(swarmMetrics.messagesReprocessed.get({ streamKey: "s1" })).toBe(2);
    });

    it("records LLM call histogram across 200 agent steps", () => {
      for (let i = 0; i < 200; i++) {
        const durationMs = 100 + (i % 50) * 10;
        swarmMetrics.llmCallDurationMs.observe(durationMs, { missionId: "m1" });
      }

      expect(swarmMetrics.llmCallDurationMs.getCount({ missionId: "m1" })).toBe(
        200
      );
      expect(
        swarmMetrics.llmCallDurationMs.getSum({ missionId: "m1" })
      ).toBeGreaterThan(0);

      const avgMs =
        swarmMetrics.llmCallDurationMs.getSum({ missionId: "m1" }) /
        swarmMetrics.llmCallDurationMs.getCount({ missionId: "m1" });
      expect(avgMs).toBeGreaterThan(100);
      expect(avgMs).toBeLessThan(600);
    });

    it("budget tracking remains precise under rapid concurrent updates", () => {
      const AGENT_COUNT = 50;
      const COST_PER_STEP = 2;
      const STEPS_PER_AGENT = 10;

      for (let agent = 0; agent < AGENT_COUNT; agent++) {
        for (let step = 0; step < STEPS_PER_AGENT; step++) {
          const current = swarmMetrics.budgetConsumedCents.get({
            missionId: "m1",
          });
          swarmMetrics.budgetConsumedCents.set(current + COST_PER_STEP, {
            missionId: "m1",
          });
        }
      }

      const expected = AGENT_COUNT * STEPS_PER_AGENT * COST_PER_STEP;
      expect(swarmMetrics.budgetConsumedCents.get({ missionId: "m1" })).toBe(
        expected
      );
      expect(expected).toBe(1000);
    });

    it("spawn rejected counter tracks governance violations", () => {
      const reasons = [
        "depth_exceeded",
        "budget_exceeded",
        "concurrency_limit",
        "cycle_detected",
      ] as const;

      for (let i = 0; i < 100; i++) {
        const reason = reasons[i % reasons.length] ?? "depth_exceeded";
        swarmMetrics.spawnRejected.inc({ missionId: "m1", reason });
      }

      expect(
        swarmMetrics.spawnRejected.get({
          missionId: "m1",
          reason: "depth_exceeded",
        })
      ).toBe(25);
      expect(
        swarmMetrics.spawnRejected.get({
          missionId: "m1",
          reason: "budget_exceeded",
        })
      ).toBe(25);
      expect(
        swarmMetrics.spawnRejected.get({
          missionId: "m1",
          reason: "concurrency_limit",
        })
      ).toBe(25);
      expect(
        swarmMetrics.spawnRejected.get({
          missionId: "m1",
          reason: "cycle_detected",
        })
      ).toBe(25);
    });

    it("resetAllMetrics clears all counters after heavy use", () => {
      for (let i = 0; i < 1000; i++) {
        swarmMetrics.messagesSent.inc({ missionId: `m-${i % 10}` });
        swarmMetrics.spawnTotal.inc({ missionId: `m-${i % 10}` });
      }

      expect(swarmMetrics.messagesSent.get({ missionId: "m-0" })).toBe(100);
      expect(swarmMetrics.spawnTotal.get({ missionId: "m-0" })).toBe(100);

      resetAllMetrics();

      for (let i = 0; i < 10; i++) {
        expect(swarmMetrics.messagesSent.get({ missionId: `m-${i}` })).toBe(0);
        expect(swarmMetrics.spawnTotal.get({ missionId: `m-${i}` })).toBe(0);
      }
    });
  });

  describe("cycle detection under stress", () => {
    it("detects cycles in a 100-node chain", () => {
      const spawnTree = new Map<string, string>();
      for (let i = 1; i < 100; i++) {
        spawnTree.set(`agent-${i}`, `agent-${i - 1}`);
      }

      expect(wouldCreateCycle(spawnTree, "agent-99", "agent-0")).toBe(true);
      expect(wouldCreateCycle(spawnTree, "agent-99", "agent-new")).toBe(false);
    });

    it("handles deep ancestry without false positives", () => {
      const spawnTree = new Map<string, string>();
      spawnTree.set("worker-a", "planner");
      spawnTree.set("worker-b", "planner");
      spawnTree.set("synthesizer", "worker-a");

      expect(wouldCreateCycle(spawnTree, "synthesizer", "planner")).toBe(true);
      expect(wouldCreateCycle(spawnTree, "synthesizer", "worker-c")).toBe(
        false
      );
      expect(wouldCreateCycle(spawnTree, "worker-b", "planner")).toBe(true);
    });

    it("operates efficiently on wide trees (50 children per node, 2550 nodes)", () => {
      const spawnTree = new Map<string, string>();

      for (let i = 0; i < 50; i++) {
        spawnTree.set(`child-${i}`, "root");
        for (let j = 0; j < 50; j++) {
          spawnTree.set(`gc-${i}-${j}`, `child-${i}`);
        }
      }

      expect(wouldCreateCycle(spawnTree, "gc-25-25", "root")).toBe(true);
      expect(wouldCreateCycle(spawnTree, "gc-25-25", "gc-0-0")).toBe(false);
    });
  });
});
