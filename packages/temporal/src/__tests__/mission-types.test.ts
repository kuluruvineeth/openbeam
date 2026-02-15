import {
  MissionAgentRunInputSchema,
  MissionAgentRunOutputSchema,
  MissionCommandPayloadSchema,
  MissionOrchestratorInputSchema,
  MissionOrchestratorOutputSchema,
  MissionRuntimeQueryResultSchema,
  MissionWakePayloadSchema,
  SpawnAgentRequestSchema,
  SpawnAgentSignalPayloadSchema,
  SpawnedAgentBlueprintSchema,
  SpawnLimitsSchema,
  SpawnValidationResultSchema,
} from "@openplane/types/temporal/mission";
import { describe, expect, it } from "vitest";

describe("Mission Type Schemas", () => {
  describe("MissionOrchestratorInputSchema", () => {
    it("parses valid input", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        objective: "Build a thing",
        maxConcurrentRuns: 5,
        budgetCents: 10_000,
        heartbeatIntervalMin: 30,
      };

      const result = MissionOrchestratorInputSchema.parse(input);
      expect(result.missionId).toBe("m1");
      expect(result.maxConcurrentRuns).toBe(5);
    });

    it("applies defaults", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        objective: "Build a thing",
      };

      const result = MissionOrchestratorInputSchema.parse(input);
      expect(result.maxConcurrentRuns).toBe(3);
      expect(result.heartbeatIntervalMin).toBe(2);
    });

    it("accepts optional checkpoint", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        objective: "Build a thing",
        checkpoint: {
          dispatchedRuns: 10,
          completedTasks: 5,
          consumedCents: 300,
          lastDispatchAt: 1_700_000_000_000,
          spawnedAgentCount: 2,
          crossMissionEvents: [
            {
              type: "knowledge_broadcast",
              knowledgeId: "knowledge-1",
              category: "analysis",
              summary: "Shared summary",
              sourceMissionId: "mission-2",
            },
          ],
        },
      };

      const result = MissionOrchestratorInputSchema.parse(input);
      expect(result.checkpoint?.dispatchedRuns).toBe(10);
      expect(result.checkpoint?.spawnedAgentCount).toBe(2);
      expect(result.checkpoint?.crossMissionEvents).toHaveLength(1);
    });

    it("accepts spawn limits", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        objective: "Build a thing",
        spawnLimits: {
          maxSpawnedAgentsPerMission: 12,
          maxSpawnedAgentsPerAgent: 4,
          maxSpawnDepth: 3,
          maxConcurrentSpawned: 6,
          spawnBudgetPercentage: 25,
        },
      };

      const result = MissionOrchestratorInputSchema.parse(input);
      expect(result.spawnLimits?.maxSpawnDepth).toBe(3);
    });

    it("rejects invalid maxConcurrentRuns", () => {
      expect(() =>
        MissionOrchestratorInputSchema.parse({
          missionId: "m1",
          teamId: "team1",
          objective: "Test",
          maxConcurrentRuns: -1,
        })
      ).toThrow();
    });

    it("rejects negative budgetCents", () => {
      expect(() =>
        MissionOrchestratorInputSchema.parse({
          missionId: "m1",
          teamId: "team1",
          objective: "Test",
          budgetCents: -100,
        })
      ).toThrow();
    });
  });

  describe("MissionOrchestratorOutputSchema", () => {
    it("parses valid output", () => {
      const output = {
        missionId: "m1",
        dispatchedRuns: 10,
        completedTasks: 8,
        consumedCents: 500,
        status: "completed" as const,
      };

      const result = MissionOrchestratorOutputSchema.parse(output);
      expect(result.status).toBe("completed");
    });

    it("validates status enum", () => {
      expect(() =>
        MissionOrchestratorOutputSchema.parse({
          missionId: "m1",
          dispatchedRuns: 0,
          completedTasks: 0,
          consumedCents: 0,
          status: "invalid",
        })
      ).toThrow();
    });
  });

  describe("MissionAgentRunInputSchema", () => {
    it("parses valid agent run input", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
        runId: "r1",
        soulPrompt: "You are a researcher",
        maxSteps: 10,
      };

      const result = MissionAgentRunInputSchema.parse(input);
      expect(result.soulPrompt).toBe("You are a researcher");
      expect(result.maxSteps).toBe(10);
    });

    it("applies default maxSteps", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
        runId: "r1",
        soulPrompt: "prompt",
      };

      const result = MissionAgentRunInputSchema.parse(input);
      expect(result.maxSteps).toBe(20);
    });

    it("accepts tools array", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
        runId: "r1",
        soulPrompt: "prompt",
        tools: ["search_hybrid", "rag_answer"],
      };

      const result = MissionAgentRunInputSchema.parse(input);
      expect(result.tools).toEqual(["search_hybrid", "rag_answer"]);
    });

    it("validates without tools (backwards compat)", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
        runId: "r1",
        soulPrompt: "prompt",
      };

      const result = MissionAgentRunInputSchema.parse(input);
      expect(result.tools).toBeUndefined();
    });

    it("accepts budgetCentsLimit field", () => {
      const input = {
        missionId: "m1",
        teamId: "team1",
        agentId: "a1",
        taskId: "t1",
        runId: "r1",
        soulPrompt: "Do stuff",
        budgetCentsLimit: 500,
      };
      const result = MissionAgentRunInputSchema.parse(input);
      expect(result.budgetCentsLimit).toBe(500);
    });
  });

  describe("MissionAgentRunOutputSchema", () => {
    it("parses valid agent run output", () => {
      const output = {
        runId: "r1",
        taskId: "t1",
        agentId: "a1",
        steps: 5,
        tokensUsed: 1000,
        costCents: 10,
        artifacts: [{ type: "code", content: "hello" }],
        status: "completed" as const,
      };

      const result = MissionAgentRunOutputSchema.parse(output);
      expect(result.steps).toBe(5);
      expect(result.artifacts).toHaveLength(1);
    });
  });

  describe("MissionWakePayloadSchema", () => {
    it("parses all valid wake reasons", () => {
      const reasons = [
        "heartbeat",
        "task",
        "mention",
        "manual",
        "run_complete",
      ] as const;

      for (const reason of reasons) {
        const result = MissionWakePayloadSchema.parse({
          missionId: "m1",
          reason,
        });
        expect(result.reason).toBe(reason);
      }
    });

    it("accepts optional metadata", () => {
      const result = MissionWakePayloadSchema.parse({
        missionId: "m1",
        reason: "task",
        metadata: { taskId: "t1" },
      });

      expect(result.metadata?.taskId).toBe("t1");
    });
  });

  describe("MissionCommandPayloadSchema", () => {
    it("parses all valid actions", () => {
      const actions = ["pause", "resume", "cancel"] as const;

      for (const action of actions) {
        const result = MissionCommandPayloadSchema.parse({
          action,
          actorId: "user-1",
        });
        expect(result.action).toBe(action);
      }
    });
  });

  describe("MissionRuntimeQueryResultSchema", () => {
    it("parses valid runtime state", () => {
      const state = {
        status: "dispatching" as const,
        queueDepth: 5,
        runningAgents: 2,
        lastDispatchAt: 1_700_000_000_000,
        budgetRemaining: 500,
        dispatchedRuns: 10,
        completedTasks: 7,
      };

      const result = MissionRuntimeQueryResultSchema.parse(state);
      expect(result.status).toBe("dispatching");
      expect(result.budgetRemaining).toBe(500);
    });

    it("handles optional fields", () => {
      const state = {
        status: "idle" as const,
        queueDepth: 0,
        runningAgents: 0,
        dispatchedRuns: 0,
        completedTasks: 0,
      };

      const result = MissionRuntimeQueryResultSchema.parse(state);
      expect(result.lastDispatchAt).toBeUndefined();
      expect(result.budgetRemaining).toBeUndefined();
    });
  });

  describe("SpawnAgentRequestSchema", () => {
    it("parses valid spawn request", () => {
      const result = SpawnAgentRequestSchema.parse({
        requestingAgentId: "agent-1",
        taskDescription:
          "Investigate connector failure mode and provide fix plan",
        requiredCapabilities: ["research", "debugging"],
      });

      expect(result.priority).toBe("P2");
      expect(result.maxSteps).toBe(10);
      expect(result.budgetCentsLimit).toBe(50);
    });

    it("rejects short task descriptions", () => {
      expect(() =>
        SpawnAgentRequestSchema.parse({
          requestingAgentId: "agent-1",
          taskDescription: "too short",
          requiredCapabilities: ["research"],
        })
      ).toThrow();
    });
  });

  describe("SpawnValidationResultSchema", () => {
    it("parses approved result", () => {
      const result = SpawnValidationResultSchema.parse({
        approved: true,
        reason: "ok",
        adjustedBudgetCents: 30,
        adjustedMaxSteps: 8,
      });

      expect(result.approved).toBe(true);
      expect(result.adjustedBudgetCents).toBe(30);
    });
  });

  describe("SpawnedAgentBlueprintSchema", () => {
    it("parses blueprint", () => {
      const result = SpawnedAgentBlueprintSchema.parse({
        name: "Research Specialist",
        role: "Specialist for research",
        soulPrompt: "prompt",
        tools: ["search_hybrid"],
        capabilities: ["research"],
        maxSteps: 8,
        budgetCentsLimit: 40,
        parentAgentId: "agent-1",
        spawnReason: "Research a sub-problem",
      });

      expect(result.name).toBe("Research Specialist");
      expect(result.tools).toEqual(["search_hybrid"]);
    });
  });

  describe("SpawnAgentSignalPayloadSchema", () => {
    it("parses signal payload", () => {
      const result = SpawnAgentSignalPayloadSchema.parse({
        requestId: "spawn-1",
        request: {
          requestingAgentId: "agent-1",
          taskDescription: "Collect and summarize sources about policy changes",
          requiredCapabilities: ["research"],
        },
      });

      expect(result.requestId).toBe("spawn-1");
      expect(result.request.requiredCapabilities).toEqual(["research"]);
    });
  });

  describe("SpawnLimitsSchema", () => {
    it("applies defaults", () => {
      const result = SpawnLimitsSchema.parse({});

      expect(result.maxSpawnedAgentsPerMission).toBe(10);
      expect(result.maxSpawnDepth).toBe(2);
      expect(result.spawnBudgetPercentage).toBe(30);
    });
  });
});
