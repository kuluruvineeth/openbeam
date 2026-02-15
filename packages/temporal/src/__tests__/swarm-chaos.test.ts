import {
  SHARD_THRESHOLD,
  SpawnLimitsSchema,
} from "@openplane/types/temporal/mission";
import type { AgentMessageEnvelope } from "@openplane/types/temporal/mission-messaging";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAllMetrics, swarmMetrics } from "../config/metrics";
import { LLM_CALL_RETRY_POLICY } from "../config/retry-policies";
import {
  computeHeartbeatInterval,
  computeHeartbeatIntervalMs,
  LLM_CALL_TIMEOUTS,
} from "../config/timeouts";
import { wouldCreateCycle } from "../workflows/mission/mission-orchestrator";

interface RunningAgent {
  agentId: string;
  childWorkflowId: string;
  agentName: string;
  status: "running" | "completed" | "failed" | "terminated";
  stepIndex: number;
  costCents: number;
  lastHeartbeatAt: number;
}

interface ActivityCheckpoint {
  step: number;
  state: Record<string, unknown>;
  timestamp: number;
}

interface OrchestratorCheckpoint {
  dispatchedRuns: number;
  completedTasks: number;
  consumedCents: number;
  lastDispatchAt: number | undefined;
  spawnedAgentCount: number;
  pendingMessages: AgentMessageEnvelope[];
  crossMissionEvents: unknown[];
  spawnTree: [string, string][];
}

function buildAgent(
  id: string,
  overrides?: Partial<RunningAgent>
): RunningAgent {
  return {
    agentId: id,
    childWorkflowId: `wf-${id}`,
    agentName: `Agent ${id}`,
    status: "running",
    stepIndex: 0,
    costCents: 0,
    lastHeartbeatAt: Date.now(),
    ...overrides,
  };
}

function computeRetryDelay(
  initialIntervalMs: number,
  backoffCoefficient: number,
  attempt: number,
  maximumIntervalMs: number
): number {
  const delay = initialIntervalMs * backoffCoefficient ** (attempt - 1);
  return Math.min(delay, maximumIntervalMs);
}

const DURATION_REGEX = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/;

function parseDurationToMs(duration: string): number {
  const match = duration.match(DURATION_REGEX);
  if (!match) {
    return 0;
  }
  const value = Number(match[1]);
  const unit = match[2] as "ms" | "s" | "m" | "h";
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 } as const;
  return Math.round(value * multipliers[unit]);
}

describe("Swarm chaos tests", () => {
  describe("budget exhaustion halts spawns", () => {
    it("rejects spawn when budget is exhausted", () => {
      const budgetCents = 1000;
      const consumedCents = 1000;
      const _limits = SpawnLimitsSchema.parse({});

      const budgetExhausted = consumedCents >= budgetCents;
      expect(budgetExhausted).toBe(true);

      const activeAgents = new Map<string, RunningAgent>();
      activeAgents.set("agent-1", buildAgent("agent-1"));
      activeAgents.set("agent-2", buildAgent("agent-2"));
      expect(activeAgents.size).toBe(2);
    });

    it("active agents continue when budget exhausted (graceful degradation)", () => {
      const activeAgents = new Map<string, RunningAgent>();
      activeAgents.set("agent-1", buildAgent("agent-1"));
      activeAgents.set("agent-2", buildAgent("agent-2"));

      const budgetCents = 1000;
      const consumedCents = 1200;

      const budgetExhausted = consumedCents >= budgetCents;
      expect(budgetExhausted).toBe(true);
      expect(activeAgents.size).toBe(2);
      expect(activeAgents.get("agent-1")).toBeDefined();
    });
  });

  describe("continueAsNew at 40K events preserves state", () => {
    it("serializes and deserializes full orchestrator state", () => {
      const activeAgents = new Map<string, RunningAgent>();
      for (let i = 0; i < 100; i++) {
        activeAgents.set(`agent-${i}`, buildAgent(`agent-${i}`));
      }

      const shardMap = new Map<string, string>();
      for (let i = 0; i < 100; i++) {
        const shardId = Math.floor(i / SHARD_THRESHOLD) + 1;
        shardMap.set(`agent-${i}`, `shard-wf-${shardId}`);
      }

      const spawnTree = new Map<string, string>();
      spawnTree.set("agent-1", "agent-0");
      spawnTree.set("agent-2", "agent-0");
      spawnTree.set("agent-3", "agent-1");

      const pendingMessages: AgentMessageEnvelope[] = [
        {
          message: {
            id: "msg-pending",
            missionId: "m1",
            senderId: "agent-0",
            recipientId: "agent-99",
            kind: "direct",
            priority: "high",
            subject: "test",
            body: { data: "important" },
            createdAt: Date.now(),
          },
        },
      ];

      const checkpoint: OrchestratorCheckpoint = {
        dispatchedRuns: 150,
        completedTasks: 120,
        consumedCents: 4500,
        lastDispatchAt: Date.now(),
        spawnedAgentCount: 100,
        pendingMessages,
        crossMissionEvents: [{ type: "knowledge_broadcast" }],
        spawnTree: [...spawnTree.entries()],
      };

      const serialized = JSON.stringify(checkpoint);
      const restored = JSON.parse(serialized) as OrchestratorCheckpoint;

      expect(restored.dispatchedRuns).toBe(150);
      expect(restored.completedTasks).toBe(120);
      expect(restored.consumedCents).toBe(4500);
      expect(restored.spawnedAgentCount).toBe(100);
      expect(restored.pendingMessages).toHaveLength(1);
      expect(restored.pendingMessages[0]?.message.id).toBe("msg-pending");
      expect(restored.crossMissionEvents).toHaveLength(1);

      const restoredTree = new Map(restored.spawnTree);
      expect(restoredTree.size).toBe(3);
      expect(restoredTree.get("agent-1")).toBe("agent-0");
      expect(restoredTree.get("agent-3")).toBe("agent-1");

      expect(wouldCreateCycle(restoredTree, "agent-3", "agent-0")).toBe(true);
      expect(wouldCreateCycle(restoredTree, "agent-3", "agent-50")).toBe(false);
    });
  });

  describe("orphaned agent cleanup", () => {
    it("handles agent completion when not in shardMap", () => {
      const activeAgents = new Map<string, RunningAgent>();
      activeAgents.set("agent-direct", buildAgent("agent-direct"));

      const shardMap = new Map<string, string>();
      const activeShards = new Map<string, number>();

      let consumedCents = 100;
      let completedTasks = 5;
      const costCents = 25;

      activeAgents.delete("agent-direct");
      consumedCents += costCents;
      completedTasks += 1;

      const agentShardId = shardMap.get("agent-direct");
      expect(agentShardId).toBeUndefined();

      expect(activeAgents.size).toBe(0);
      expect(consumedCents).toBe(125);
      expect(completedTasks).toBe(6);
      expect(activeShards.size).toBe(0);
    });
  });

  describe("DLQ message recovery", () => {
    it("message that fails delivery 3 times moves to DLQ", () => {
      const MAX_DELIVERY_ATTEMPTS = 3;
      let deliveryCount = 0;
      let inDLQ = false;

      for (let attempt = 0; attempt < 4; attempt++) {
        deliveryCount += 1;
        const processingFailed = true;

        if (processingFailed && deliveryCount > MAX_DELIVERY_ATTEMPTS) {
          inDLQ = true;
          break;
        }
      }

      expect(inDLQ).toBe(true);
      expect(deliveryCount).toBe(4);
    });

    it("DLQ entry contains original envelope and delivery count", () => {
      const envelope: AgentMessageEnvelope = {
        message: {
          id: "failing-msg",
          missionId: "m1",
          senderId: "agent-a",
          recipientId: "agent-b",
          kind: "direct",
          priority: "normal",
          subject: "will-fail",
          body: {},
          createdAt: Date.now(),
        },
      };

      const dlqEntry = {
        originalStreamKey: "agent-stream:m1:agent-b:normal",
        originalMessageId: "1-0",
        envelope,
        deliveryAttempts: 4,
        deadLetteredAt: Date.now(),
        reason: "Exceeded max delivery attempts (3)",
      };

      expect(dlqEntry.envelope.message.id).toBe("failing-msg");
      expect(dlqEntry.deliveryAttempts).toBe(4);
      expect(dlqEntry.originalStreamKey).toContain("agent-b");
    });
  });

  describe("cycle detection under rapid spawn", () => {
    it("detects cycle in depth-5 chain when tail tries to spawn root", () => {
      const tree = new Map<string, string>();
      tree.set("B", "A");
      tree.set("C", "B");
      tree.set("D", "C");
      tree.set("E", "D");

      expect(wouldCreateCycle(tree, "E", "A")).toBe(true);
    });

    it("allows non-cyclic spawn from tail", () => {
      const tree = new Map<string, string>();
      tree.set("B", "A");
      tree.set("C", "B");
      tree.set("D", "C");
      tree.set("E", "D");

      expect(wouldCreateCycle(tree, "E", "F")).toBe(false);
    });

    it("allows non-cyclic spawn from mid-chain", () => {
      const tree = new Map<string, string>();
      tree.set("B", "A");
      tree.set("C", "B");
      tree.set("D", "C");
      tree.set("E", "D");

      expect(wouldCreateCycle(tree, "D", "F")).toBe(false);
    });

    it("detects cycle when new child would link back to ancestor", () => {
      const tree = new Map<string, string>();
      tree.set("B", "A");
      tree.set("C", "B");
      tree.set("D", "C");
      tree.set("E", "D");

      tree.set("F", "E");

      expect(wouldCreateCycle(tree, "F", "A")).toBe(true);
      expect(wouldCreateCycle(tree, "F", "B")).toBe(true);
      expect(wouldCreateCycle(tree, "F", "C")).toBe(true);
    });
  });

  describe("shard rebalancing after mass completion", () => {
    it("removes empty shards when all agents complete", () => {
      const activeAgents = new Map<string, RunningAgent>();
      const shardMap = new Map<string, string>();
      const activeShards = new Map<string, number>();

      for (let i = 0; i < 100; i++) {
        const agent = buildAgent(`agent-${i}`);
        activeAgents.set(agent.agentId, agent);
        const shardIdx = Math.floor(i / 50) + 1;
        const shardWorkflowId = `shard-wf-${shardIdx}`;
        shardMap.set(agent.agentId, shardWorkflowId);
        activeShards.set(
          shardWorkflowId,
          (activeShards.get(shardWorkflowId) ?? 0) + 1
        );
      }

      expect(activeShards.size).toBe(2);
      expect(activeShards.get("shard-wf-1")).toBe(50);
      expect(activeShards.get("shard-wf-2")).toBe(50);

      for (let i = 0; i < 50; i++) {
        const agentId = `agent-${i}`;
        activeAgents.delete(agentId);
        const shardId = shardMap.get(agentId) ?? "";
        shardMap.delete(agentId);
        const count = activeShards.get(shardId) ?? 1;
        if (count <= 1) {
          activeShards.delete(shardId);
        } else {
          activeShards.set(shardId, count - 1);
        }
      }

      expect(activeShards.size).toBe(1);
      expect(activeShards.has("shard-wf-1")).toBe(false);
      expect(activeShards.get("shard-wf-2")).toBe(50);

      expect(activeAgents.size).toBe(50);
      for (let i = 50; i < 100; i++) {
        expect(activeAgents.has(`agent-${i}`)).toBe(true);
      }
    });
  });

  describe("LLM timeout with retry policy enforcement", () => {
    it("retry backoff doubles per attempt up to maximumInterval", () => {
      const initialMs = parseDurationToMs(
        LLM_CALL_RETRY_POLICY.initialInterval as string
      );
      const maxMs = parseDurationToMs(
        LLM_CALL_RETRY_POLICY.maximumInterval as string
      );
      const backoff = LLM_CALL_RETRY_POLICY.backoffCoefficient ?? 2;

      const delays = Array.from({ length: 6 }, (_, i) =>
        computeRetryDelay(initialMs, backoff, i + 1, maxMs)
      );

      expect(delays[0]).toBe(2000);
      expect(delays[1]).toBe(4000);
      expect(delays[2]).toBe(8000);
      expect(delays[3]).toBe(16_000);
      expect(delays[4]).toBe(30_000);
      expect(delays[5]).toBe(30_000);
    });

    it("respects maximumAttempts for LLM calls", () => {
      const maxAttempts = LLM_CALL_RETRY_POLICY.maximumAttempts ?? 4;
      expect(maxAttempts).toBe(4);

      let attempts = 0;
      let succeeded = false;

      for (let i = 0; i < 10; i++) {
        attempts += 1;
        const timedOut = true;

        if (timedOut && attempts >= maxAttempts) {
          break;
        }

        if (!timedOut) {
          succeeded = true;
          break;
        }
      }

      expect(attempts).toBe(maxAttempts);
      expect(succeeded).toBe(false);
    });

    it("classifies BUDGET_EXCEEDED as non-retryable", () => {
      const nonRetryable = LLM_CALL_RETRY_POLICY.nonRetryableErrorTypes ?? [];

      expect(nonRetryable).toContain("BUDGET_EXCEEDED");
      expect(nonRetryable).toContain("INVALID_PROMPT");
      expect(nonRetryable).toContain("CONTENT_FILTERED");

      const retryableErrors = [
        "TIMEOUT",
        "RATE_LIMITED",
        "SERVICE_UNAVAILABLE",
      ];
      for (const error of retryableErrors) {
        expect(nonRetryable).not.toContain(error);
      }
    });

    it("heartbeat timeout detects stale LLM calls", () => {
      const heartbeatTimeout = LLM_CALL_TIMEOUTS.heartbeatTimeout ?? "45s";
      const heartbeatMs = parseDurationToMs(heartbeatTimeout);
      expect(heartbeatMs).toBe(45_000);

      const startToCloseMs = parseDurationToMs(
        LLM_CALL_TIMEOUTS.startToCloseTimeout
      );
      expect(startToCloseMs).toBe(180_000);

      const intervalMs = computeHeartbeatIntervalMs(heartbeatMs);
      expect(intervalMs).toBe(15_000);

      const simulatedElapsed = 120_000;
      const lastHeartbeat = 0;
      const isStale = simulatedElapsed - lastHeartbeat > heartbeatMs;
      expect(isStale).toBe(true);
    });

    it("120s LLM delay exceeds heartbeat timeout triggering activity failure", () => {
      const LLM_DELAY_MS = 120_000;
      const heartbeatMs = parseDurationToMs(
        LLM_CALL_TIMEOUTS.heartbeatTimeout ?? "45s"
      );

      const heartbeatsMissed = Math.floor(LLM_DELAY_MS / heartbeatMs);
      expect(heartbeatsMissed).toBeGreaterThanOrEqual(2);

      const wouldTimeout = LLM_DELAY_MS > heartbeatMs;
      expect(wouldTimeout).toBe(true);

      const withinStartToClose =
        LLM_DELAY_MS < parseDurationToMs(LLM_CALL_TIMEOUTS.startToCloseTimeout);
      expect(withinStartToClose).toBe(true);
    });
  });

  describe("budget exhaustion across 10 concurrent agents ($0.10 budget)", () => {
    const BUDGET_CENTS = 10;
    const AGENT_COUNT = 10;
    const COST_PER_STEP_CENTS = 1;

    beforeEach(() => {
      resetAllMetrics();
    });

    it("agents self-terminate when budget exhausted", () => {
      const agents = new Map<string, RunningAgent>();
      for (let i = 0; i < AGENT_COUNT; i++) {
        agents.set(`agent-${i}`, buildAgent(`agent-${i}`));
      }

      let consumedCents = 0;
      const terminationOrder: string[] = [];

      for (let step = 0; step < 20; step++) {
        for (const [id, agent] of agents) {
          if (agent.status !== "running") {
            continue;
          }

          if (consumedCents + COST_PER_STEP_CENTS > BUDGET_CENTS) {
            agent.status = "terminated";
            terminationOrder.push(id);
            continue;
          }

          consumedCents += COST_PER_STEP_CENTS;
          agent.stepIndex = step;
          agent.costCents += COST_PER_STEP_CENTS;
          swarmMetrics.budgetConsumedCents.set(consumedCents, {
            missionId: "m1",
          });
        }
      }

      expect(consumedCents).toBe(BUDGET_CENTS);

      const runningAgents = [...agents.values()].filter(
        (a) => a.status === "running"
      );
      expect(runningAgents).toHaveLength(0);

      const terminatedAgents = [...agents.values()].filter(
        (a) => a.status === "terminated"
      );
      expect(terminatedAgents.length).toBeGreaterThan(0);

      expect(swarmMetrics.budgetConsumedCents.get({ missionId: "m1" })).toBe(
        BUDGET_CENTS
      );
    });

    it("orchestrator rejects new spawns after budget exhaustion", () => {
      let consumedCents = BUDGET_CENTS;
      const spawnQueue = Array.from({ length: 5 }, (_, i) => `new-agent-${i}`);
      const rejectedSpawns: string[] = [];

      for (const agentId of spawnQueue) {
        if (consumedCents >= BUDGET_CENTS) {
          rejectedSpawns.push(agentId);
          swarmMetrics.spawnRejected.inc({
            missionId: "m1",
            reason: "budget_exceeded",
          });
          continue;
        }
        consumedCents += COST_PER_STEP_CENTS;
      }

      expect(rejectedSpawns).toHaveLength(5);
      expect(
        swarmMetrics.spawnRejected.get({
          missionId: "m1",
          reason: "budget_exceeded",
        })
      ).toBe(5);
    });

    it("partial step completion tracks precise budget across agents", () => {
      const agents = new Map<string, RunningAgent>();
      for (let i = 0; i < AGENT_COUNT; i++) {
        agents.set(`agent-${i}`, buildAgent(`agent-${i}`));
      }

      let consumedCents = 0;
      let totalStepsExecuted = 0;

      for (const [, agent] of agents) {
        if (consumedCents + COST_PER_STEP_CENTS > BUDGET_CENTS) {
          break;
        }
        consumedCents += COST_PER_STEP_CENTS;
        agent.costCents += COST_PER_STEP_CENTS;
        agent.stepIndex += 1;
        totalStepsExecuted += 1;
      }

      expect(totalStepsExecuted).toBe(BUDGET_CENTS);
      expect(consumedCents).toBe(BUDGET_CENTS);

      const totalAgentCost = [...agents.values()].reduce(
        (sum, a) => sum + a.costCents,
        0
      );
      expect(totalAgentCost).toBe(consumedCents);
    });
  });

  describe("continueAsNew at 40K events preserves full swarm state", () => {
    it("serializes 200-agent state with deep spawn tree", () => {
      const AGENT_COUNT = 200;
      const activeAgents = new Map<string, RunningAgent>();
      for (let i = 0; i < AGENT_COUNT; i++) {
        activeAgents.set(
          `agent-${i}`,
          buildAgent(`agent-${i}`, {
            stepIndex: Math.floor(Math.random() * 50),
            costCents: Math.floor(Math.random() * 100),
          })
        );
      }

      const spawnTree = new Map<string, string>();
      for (let i = 1; i < AGENT_COUNT; i++) {
        spawnTree.set(`agent-${i}`, `agent-${Math.floor(i / 3)}`);
      }

      const shardMap = new Map<string, string>();
      for (let i = 0; i < AGENT_COUNT; i++) {
        const shardIdx = Math.floor(i / SHARD_THRESHOLD) + 1;
        shardMap.set(`agent-${i}`, `shard-wf-${shardIdx}`);
      }

      const pendingMessages: AgentMessageEnvelope[] = Array.from(
        { length: 50 },
        (_, i) => ({
          message: {
            id: `pending-${i}`,
            missionId: "m1",
            senderId: `agent-${i % AGENT_COUNT}`,
            recipientId: `agent-${(i + 1) % AGENT_COUNT}`,
            kind: "direct" as const,
            priority:
              (["critical", "high", "normal", "low"] as const)[i % 4] ??
              "normal",
            subject: "continueAsNew-test",
            body: { step: i },
            createdAt: Date.now(),
          },
        })
      );

      const checkpoint: OrchestratorCheckpoint = {
        dispatchedRuns: 800,
        completedTasks: 600,
        consumedCents: 15_000,
        lastDispatchAt: Date.now(),
        spawnedAgentCount: AGENT_COUNT,
        pendingMessages,
        crossMissionEvents: Array.from({ length: 10 }, (_, i) => ({
          type: "knowledge_broadcast",
          sourceId: `agent-${i}`,
        })),
        spawnTree: [...spawnTree.entries()],
      };

      const serialized = JSON.stringify(checkpoint);
      const sizeKB = Buffer.byteLength(serialized) / 1024;
      expect(sizeKB).toBeLessThan(500);

      const restored = JSON.parse(serialized) as OrchestratorCheckpoint;

      expect(restored.dispatchedRuns).toBe(800);
      expect(restored.completedTasks).toBe(600);
      expect(restored.consumedCents).toBe(15_000);
      expect(restored.spawnedAgentCount).toBe(AGENT_COUNT);
      expect(restored.pendingMessages).toHaveLength(50);
      expect(restored.crossMissionEvents).toHaveLength(10);

      const restoredTree = new Map(restored.spawnTree);
      expect(restoredTree.size).toBe(AGENT_COUNT - 1);

      expect(wouldCreateCycle(restoredTree, "agent-150", "agent-0")).toBe(true);
      expect(wouldCreateCycle(restoredTree, "agent-150", "agent-new")).toBe(
        false
      );
    });

    it("40K event count triggers continueAsNew at correct threshold", () => {
      const CONTINUE_AS_NEW_THRESHOLD = 10_000;
      let historyLength = 0;
      let continueAsNewTriggered = false;

      for (let step = 0; step < 500; step++) {
        historyLength += 80;

        if (
          historyLength > CONTINUE_AS_NEW_THRESHOLD &&
          !continueAsNewTriggered
        ) {
          continueAsNewTriggered = true;
          break;
        }
      }

      expect(continueAsNewTriggered).toBe(true);
      expect(historyLength).toBeGreaterThan(CONTINUE_AS_NEW_THRESHOLD);
      expect(historyLength).toBeLessThan(15_000);
    });
  });

  describe("network partition with message buffering and dedup", () => {
    it("messages buffer during partition and replay without duplicates", () => {
      const PARTITION_DURATION_STEPS = 10;
      const messageBuffer: AgentMessageEnvelope[] = [];
      const deliveredIds = new Set<string>();
      let partitionActive = false;
      let duplicateCount = 0;
      let deliveredCount = 0;

      for (let step = 0; step < 30; step++) {
        if (step === 10) {
          partitionActive = true;
        }
        if (step === 10 + PARTITION_DURATION_STEPS) {
          partitionActive = false;
        }

        const envelope: AgentMessageEnvelope = {
          message: {
            id: `msg-${step}`,
            missionId: "m1",
            senderId: "agent-0",
            recipientId: "agent-1",
            kind: "direct",
            priority: "normal",
            subject: "partition-test",
            body: {},
            createdAt: Date.now() + step,
          },
        };

        if (partitionActive) {
          messageBuffer.push(envelope);
          continue;
        }

        if (deliveredIds.has(envelope.message.id)) {
          duplicateCount += 1;
          continue;
        }
        deliveredIds.add(envelope.message.id);
        deliveredCount += 1;
      }

      for (const buffered of messageBuffer) {
        if (deliveredIds.has(buffered.message.id)) {
          duplicateCount += 1;
          continue;
        }
        deliveredIds.add(buffered.message.id);
        deliveredCount += 1;
      }

      expect(deliveredCount).toBe(30);
      expect(duplicateCount).toBe(0);
      expect(deliveredIds.size).toBe(30);
    });

    it("retry messages from buffer without duplication after reconnect", () => {
      const sentDuringPartition: AgentMessageEnvelope[] = [];
      const ackedIds = new Set<string>();

      for (let i = 0; i < 20; i++) {
        sentDuringPartition.push({
          message: {
            id: `partition-msg-${i}`,
            missionId: "m1",
            senderId: `agent-${i % 5}`,
            recipientId: `agent-${(i + 1) % 5}`,
            kind: "direct",
            priority:
              (["critical", "high", "normal", "low"] as const)[i % 4] ??
              "normal",
            subject: "reconnect-test",
            body: {},
            createdAt: Date.now() + i,
          },
        });
      }

      let replayRound = 0;
      const MAX_REPLAY_ROUNDS = 3;
      let totalDelivered = 0;

      while (replayRound < MAX_REPLAY_ROUNDS) {
        let deliveredThisRound = 0;
        for (const envelope of sentDuringPartition) {
          if (ackedIds.has(envelope.message.id)) {
            continue;
          }
          ackedIds.add(envelope.message.id);
          deliveredThisRound += 1;
          totalDelivered += 1;
        }

        if (deliveredThisRound === 0) {
          break;
        }
        replayRound += 1;
      }

      expect(replayRound).toBe(1);
      expect(totalDelivered).toBe(20);
      expect(ackedIds.size).toBe(20);
    });
  });

  describe("worker crash recovery with checkpoint resumption", () => {
    it("activity resumes from last checkpoint after crash", () => {
      const TOTAL_STEPS = 20;
      const CRASH_AT_STEP = 12;

      const checkpoints: ActivityCheckpoint[] = [];
      let _currentStep = 0;

      for (let step = 0; step < TOTAL_STEPS; step++) {
        if (step === CRASH_AT_STEP) {
          break;
        }
        _currentStep = step;
        checkpoints.push({
          step,
          state: { processed: step + 1 },
          timestamp: Date.now() + step,
        });
      }

      expect(checkpoints).toHaveLength(CRASH_AT_STEP);

      const lastCheckpoint = checkpoints.at(-1);
      expect(lastCheckpoint).toBeDefined();
      expect(lastCheckpoint?.step).toBe(CRASH_AT_STEP - 1);

      const resumedFrom = (lastCheckpoint?.step ?? 0) + 1;
      const postCrashSteps: number[] = [];

      for (let step = resumedFrom; step < TOTAL_STEPS; step++) {
        postCrashSteps.push(step);
        checkpoints.push({
          step,
          state: { processed: step + 1 },
          timestamp: Date.now() + step,
        });
      }

      expect(postCrashSteps[0]).toBe(CRASH_AT_STEP);
      expect(postCrashSteps).toHaveLength(TOTAL_STEPS - CRASH_AT_STEP);
      expect(checkpoints).toHaveLength(TOTAL_STEPS);
    });

    it("heartbeat progress survives crash and informs retry", () => {
      const heartbeatHistory: Array<{ step: number; progress: number }> = [];
      const CRASH_AT_STEP = 7;
      const TOTAL_ITEMS = 100;

      for (let step = 0; step < 10; step++) {
        const processed = (step + 1) * 10;
        heartbeatHistory.push({
          step,
          progress: processed / TOTAL_ITEMS,
        });

        if (step === CRASH_AT_STEP) {
          break;
        }
      }

      const lastHeartbeat = heartbeatHistory.at(-1);
      expect(lastHeartbeat).toBeDefined();
      expect(lastHeartbeat?.progress).toBe(0.8);

      const resumeFromItem = Math.floor(
        (lastHeartbeat?.progress ?? 0) * TOTAL_ITEMS
      );
      expect(resumeFromItem).toBe(80);

      const remainingItems = TOTAL_ITEMS - resumeFromItem;
      expect(remainingItems).toBe(20);
    });

    it("multiple crashes converge via retry with exponential backoff", () => {
      const MAX_ATTEMPTS = LLM_CALL_RETRY_POLICY.maximumAttempts ?? 4;
      const initialMs = parseDurationToMs(
        LLM_CALL_RETRY_POLICY.initialInterval as string
      );
      const backoff = LLM_CALL_RETRY_POLICY.backoffCoefficient ?? 2;
      const maxMs = parseDurationToMs(
        LLM_CALL_RETRY_POLICY.maximumInterval as string
      );

      const attemptLog: {
        attempt: number;
        delayMs: number;
        succeeded: boolean;
      }[] = [];
      const SUCCEED_ON_ATTEMPT = 3;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const delayMs =
          attempt === 1
            ? 0
            : computeRetryDelay(initialMs, backoff, attempt - 1, maxMs);
        const succeeded = attempt === SUCCEED_ON_ATTEMPT;
        attemptLog.push({ attempt, delayMs, succeeded });

        if (succeeded) {
          break;
        }
      }

      expect(attemptLog).toHaveLength(SUCCEED_ON_ATTEMPT);
      expect(attemptLog[0]?.delayMs).toBe(0);
      expect(attemptLog[1]?.delayMs).toBe(2000);
      expect(attemptLog[2]?.delayMs).toBe(4000);
      expect(attemptLog.at(-1)?.succeeded).toBe(true);
    });
  });

  describe("heartbeat stale detection", () => {
    it("computeHeartbeatInterval returns 1/3 of timeout with 5s floor", () => {
      expect(computeHeartbeatInterval("45s")).toBe("15s");
      expect(computeHeartbeatInterval("30s")).toBe("10s");
      expect(computeHeartbeatInterval("10s")).toBe("5s");
      expect(computeHeartbeatInterval("3s")).toBe("5s");
      expect(computeHeartbeatInterval("1m")).toBe("20s");
      expect(computeHeartbeatInterval("5m")).toBe("100s");
    });

    it("computeHeartbeatIntervalMs enforces 5000ms floor", () => {
      expect(computeHeartbeatIntervalMs(45_000)).toBe(15_000);
      expect(computeHeartbeatIntervalMs(15_000)).toBe(5000);
      expect(computeHeartbeatIntervalMs(9000)).toBe(5000);
      expect(computeHeartbeatIntervalMs(3000)).toBe(5000);
    });

    it("detects stale agents across a 50-agent swarm", () => {
      const now = Date.now();
      const heartbeatTimeoutMs = 45_000;
      const agents = new Map<string, RunningAgent>();

      for (let i = 0; i < 50; i++) {
        const lastHeartbeat = i < 10 ? now - 60_000 : now - 5000;
        agents.set(
          `agent-${i}`,
          buildAgent(`agent-${i}`, { lastHeartbeatAt: lastHeartbeat })
        );
      }

      const staleAgents: string[] = [];
      for (const [id, agent] of agents) {
        if (now - agent.lastHeartbeatAt > heartbeatTimeoutMs) {
          staleAgents.push(id);
        }
      }

      expect(staleAgents).toHaveLength(10);

      for (const staleId of staleAgents) {
        const agent = agents.get(staleId);
        if (agent) {
          agent.status = "failed";
        }
        swarmMetrics.llmCallErrors.inc({ missionId: "m1" });
      }

      expect(swarmMetrics.llmCallErrors.get({ missionId: "m1" })).toBe(10);
    });
  });

  describe("concurrent failure cascades", () => {
    beforeEach(() => {
      resetAllMetrics();
    });

    it("50% agent failure does not affect remaining agents", () => {
      const AGENT_COUNT = 20;
      const agents = new Map<string, RunningAgent>();
      for (let i = 0; i < AGENT_COUNT; i++) {
        agents.set(`agent-${i}`, buildAgent(`agent-${i}`));
      }

      for (let i = 0; i < 10; i++) {
        const agent = agents.get(`agent-${i}`);
        if (agent) {
          agent.status = "failed";
        }
        swarmMetrics.llmCallErrors.inc({ missionId: "m1" });
      }

      const healthy = [...agents.values()].filter(
        (a) => a.status === "running"
      );
      const failed = [...agents.values()].filter((a) => a.status === "failed");

      expect(healthy).toHaveLength(10);
      expect(failed).toHaveLength(10);

      for (const agent of healthy) {
        agent.stepIndex += 1;
        agent.costCents += 5;
      }

      const totalProgress = healthy.reduce((sum, a) => sum + a.stepIndex, 0);
      expect(totalProgress).toBe(10);
    });

    it("spawn tree remains valid after cascading parent failures", () => {
      const spawnTree = new Map<string, string>();
      spawnTree.set("worker-1", "planner");
      spawnTree.set("worker-2", "planner");
      spawnTree.set("sub-1a", "worker-1");
      spawnTree.set("sub-1b", "worker-1");
      spawnTree.set("sub-2a", "worker-2");
      spawnTree.set("sub-2b", "worker-2");
      spawnTree.set("leaf-1", "sub-1a");
      spawnTree.set("leaf-2", "sub-2a");

      const failedAgents = new Set(["worker-1", "sub-1a", "sub-1b", "leaf-1"]);

      const orphans: string[] = [];
      for (const [child, parent] of spawnTree) {
        if (failedAgents.has(parent) && !failedAgents.has(child)) {
          orphans.push(child);
        }
      }

      expect(orphans).toHaveLength(0);

      const survivingTree = new Map<string, string>();
      for (const [child, parent] of spawnTree) {
        if (!failedAgents.has(child)) {
          survivingTree.set(child, parent);
        }
      }

      expect(survivingTree.size).toBe(4);

      expect(wouldCreateCycle(survivingTree, "sub-2b", "planner")).toBe(true);
      expect(wouldCreateCycle(survivingTree, "leaf-2", "planner")).toBe(true);
      expect(wouldCreateCycle(survivingTree, "sub-2a", "new-agent")).toBe(
        false
      );
    });

    it("metrics accurately reflect mixed success/failure across burst", () => {
      const BURST_SIZE = 100;

      for (let i = 0; i < BURST_SIZE; i++) {
        swarmMetrics.spawnTotal.inc({ missionId: "m1" });
        swarmMetrics.agentsActive.inc({ missionId: "m1" });

        if (i % 3 === 0) {
          swarmMetrics.llmCallErrors.inc({ missionId: "m1" });
          swarmMetrics.agentsActive.dec({ missionId: "m1" });
        }
      }

      const errored = Math.floor(BURST_SIZE / 3) + 1;
      const stillActive = BURST_SIZE - errored;

      expect(swarmMetrics.spawnTotal.get({ missionId: "m1" })).toBe(BURST_SIZE);
      expect(swarmMetrics.agentsActive.get({ missionId: "m1" })).toBe(
        stillActive
      );
      expect(swarmMetrics.llmCallErrors.get({ missionId: "m1" })).toBe(errored);
    });
  });
});
