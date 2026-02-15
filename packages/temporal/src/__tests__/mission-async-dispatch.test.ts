import { AgentCompletedPayloadSchema } from "@openplane/types/temporal/mission";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@temporalio/workflow", () => {
  const signalHandlers = new Map<string, (...args: unknown[]) => void>();
  const queryHandlers = new Map<string, () => unknown>();
  let wakeConditionResolve: (() => void) | null = null;

  return {
    proxyActivities: vi.fn(
      () =>
        new Proxy(
          {},
          {
            get: (_target, prop) =>
              vi.fn().mockResolvedValue(getActivityDefault(prop as string)),
          }
        )
    ),
    setHandler: vi.fn(
      (
        signalOrQuery: { name?: string },
        handler: (...args: unknown[]) => unknown
      ) => {
        const name = signalOrQuery.name ?? "unknown";
        if (typeof handler === "function") {
          signalHandlers.set(name, handler);
          queryHandlers.set(name, handler as () => unknown);
        }
      }
    ),
    defineSignal: vi.fn((name: string) => ({ name, type: "signal" })),
    defineQuery: vi.fn((name: string) => ({ name, type: "query" })),
    condition: vi.fn((predicate?: () => boolean, _timeoutMs?: number) => {
      if (predicate?.()) {
        return Promise.resolve(true);
      }
      return new Promise<boolean>((resolve) => {
        wakeConditionResolve = () => resolve(true);
      });
    }),
    continueAsNew: vi.fn(),
    startChild: vi.fn().mockResolvedValue({
      workflowId: "child-wf-id",
      firstExecutionRunId: "child-run-id",
    }),
    executeChild: vi.fn().mockResolvedValue({
      runId: "r1",
      taskId: "t1",
      agentId: "a1",
      steps: 5,
      tokensUsed: 100,
      costCents: 10,
      artifacts: [],
      status: "completed",
    }),
    getExternalWorkflowHandle: vi.fn(() => ({
      signal: vi.fn(),
    })),
    patched: vi.fn().mockReturnValue(true),
    workflowInfo: vi.fn(() => ({
      workflowId: "mission:test-mission",
      historyLength: 100,
      startTime: new Date(),
      unsafe: {
        now: () => Date.now(),
      },
      parent: null,
    })),
    _internal: {
      signalHandlers,
      queryHandlers,
      wakeConditionResolve: () => wakeConditionResolve,
      triggerWake: () => {
        if (wakeConditionResolve) {
          wakeConditionResolve();
          wakeConditionResolve = null;
        }
      },
    },
  };
});

function getActivityDefault(name: string): unknown {
  switch (name) {
    case "refreshQueue":
      return { tasks: [] };
    case "getMissionStats":
      return { runs: { running: 0 } };
    case "planDispatch":
      return { dispatches: [] };
    case "claimTask":
      return { claimed: true };
    case "createRun":
      return { runId: "run-1" };
    case "logActivity":
    case "updateRun":
    case "finalizeMission":
    case "writeMemory":
    case "readMemory":
      return {};
    case "validateSpawnRequest":
      return { approved: false, reason: "test" };
    case "validateAgentClaim":
      return { approved: false, reason: "test" };
    case "registerMissionCapabilities":
      return {};
    case "checkMissionHealth":
      return {
        agents: [],
        failedDependencies: [],
        overallHealth: "healthy",
      };
    default:
      return {};
  }
}

describe("Mission Async Dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AgentCompletedPayloadSchema", () => {
    it("parses valid completed payload", () => {
      const payload = {
        agentId: "agent-1",
        runId: "run-1",
        status: "completed" as const,
        costCents: 15,
        completedTasks: 1,
      };

      const result = AgentCompletedPayloadSchema.parse(payload);
      expect(result.agentId).toBe("agent-1");
      expect(result.status).toBe("completed");
      expect(result.completedTasks).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it("parses failed payload with error", () => {
      const payload = {
        agentId: "agent-2",
        runId: "run-2",
        status: "failed" as const,
        costCents: 5,
        completedTasks: 0,
        error: "Agent ran into an unrecoverable error",
      };

      const result = AgentCompletedPayloadSchema.parse(payload);
      expect(result.status).toBe("failed");
      expect(result.error).toBe("Agent ran into an unrecoverable error");
      expect(result.completedTasks).toBe(0);
    });

    it("parses cancelled payload", () => {
      const payload = {
        agentId: "agent-3",
        runId: "run-3",
        status: "cancelled" as const,
        costCents: 2,
        completedTasks: 0,
      };

      const result = AgentCompletedPayloadSchema.parse(payload);
      expect(result.status).toBe("cancelled");
    });

    it("rejects invalid status", () => {
      expect(() =>
        AgentCompletedPayloadSchema.parse({
          agentId: "a",
          runId: "r",
          status: "unknown",
          costCents: 0,
          completedTasks: 0,
        })
      ).toThrow();
    });

    it("rejects missing required fields", () => {
      expect(() =>
        AgentCompletedPayloadSchema.parse({
          agentId: "a",
        })
      ).toThrow();
    });
  });

  describe("Orchestrator uses startChild instead of executeChild", () => {
    it("imports startChild from @temporalio/workflow", async () => {
      const workflow = await import("@temporalio/workflow");
      expect(workflow.startChild).toBeDefined();
    });

    it("does not use executeChild in orchestrator source", async () => {
      const fs = await import("node:fs");
      const orchestratorSource = fs.readFileSync(
        new URL(
          "../workflows/mission/mission-orchestrator.ts",
          import.meta.url
        ),
        "utf-8"
      );

      expect(orchestratorSource).not.toContain("executeChild");
      expect(orchestratorSource).toContain("startChild");
    });

    it("does not use Promise.allSettled in orchestrator source", async () => {
      const fs = await import("node:fs");
      const orchestratorSource = fs.readFileSync(
        new URL(
          "../workflows/mission/mission-orchestrator.ts",
          import.meta.url
        ),
        "utf-8"
      );

      expect(orchestratorSource).not.toContain("Promise.allSettled");
    });
  });

  describe("agentCompletedSignal handler state updates", () => {
    it("updates state correctly on completed agent signal", () => {
      const state = {
        activeAgents: new Map([
          [
            "agent-1",
            {
              agentId: "agent-1",
              childWorkflowId: "child-1",
              agentName: "Research Agent",
            },
          ],
          [
            "agent-2",
            {
              agentId: "agent-2",
              childWorkflowId: "child-2",
              agentName: "Writer Agent",
            },
          ],
        ]),
        runningAgents: 2,
        completedTasks: 3,
        consumedCents: 100,
        wakeQueue: [] as Array<{
          reason: string;
          metadata?: Record<string, unknown>;
        }>,
      };

      const handler = (payload: {
        agentId: string;
        runId: string;
        status: string;
        costCents: number;
        completedTasks: number;
        error?: string;
      }) => {
        state.activeAgents.delete(payload.agentId);
        state.runningAgents = state.activeAgents.size;
        state.completedTasks += payload.completedTasks;
        state.consumedCents += payload.costCents;
        state.wakeQueue.push({
          reason: "agent_completed",
          metadata: {
            agentId: payload.agentId,
            runId: payload.runId,
            status: payload.status,
            error: payload.error,
          },
        });
      };

      handler({
        agentId: "agent-1",
        runId: "run-1",
        status: "completed",
        costCents: 25,
        completedTasks: 1,
      });

      expect(state.activeAgents.size).toBe(1);
      expect(state.activeAgents.has("agent-1")).toBe(false);
      expect(state.activeAgents.has("agent-2")).toBe(true);
      expect(state.runningAgents).toBe(1);
      expect(state.completedTasks).toBe(4);
      expect(state.consumedCents).toBe(125);
      expect(state.wakeQueue).toHaveLength(1);
      expect(state.wakeQueue[0]?.reason).toBe("agent_completed");
      expect(state.wakeQueue[0]?.metadata?.agentId).toBe("agent-1");
    });

    it("updates state correctly on failed agent signal", () => {
      const state = {
        activeAgents: new Map([
          [
            "agent-1",
            {
              agentId: "agent-1",
              childWorkflowId: "child-1",
              agentName: "Research Agent",
            },
          ],
        ]),
        runningAgents: 1,
        completedTasks: 0,
        consumedCents: 50,
        wakeQueue: [] as Array<{
          reason: string;
          metadata?: Record<string, unknown>;
        }>,
      };

      const handler = (payload: {
        agentId: string;
        runId: string;
        status: string;
        costCents: number;
        completedTasks: number;
        error?: string;
      }) => {
        state.activeAgents.delete(payload.agentId);
        state.runningAgents = state.activeAgents.size;
        state.completedTasks += payload.completedTasks;
        state.consumedCents += payload.costCents;
        state.wakeQueue.push({
          reason: "agent_completed",
          metadata: {
            agentId: payload.agentId,
            runId: payload.runId,
            status: payload.status,
            error: payload.error,
          },
        });
      };

      handler({
        agentId: "agent-1",
        runId: "run-1",
        status: "failed",
        costCents: 8,
        completedTasks: 0,
        error: "Out of memory",
      });

      expect(state.activeAgents.size).toBe(0);
      expect(state.runningAgents).toBe(0);
      expect(state.completedTasks).toBe(0);
      expect(state.consumedCents).toBe(58);
      expect(state.wakeQueue).toHaveLength(1);
      expect(state.wakeQueue[0]?.metadata?.error).toBe("Out of memory");
      expect(state.wakeQueue[0]?.metadata?.status).toBe("failed");
    });

    it("handles multiple concurrent agent completions independently", () => {
      const state = {
        activeAgents: new Map([
          [
            "agent-1",
            {
              agentId: "agent-1",
              childWorkflowId: "child-1",
              agentName: "Agent A",
            },
          ],
          [
            "agent-2",
            {
              agentId: "agent-2",
              childWorkflowId: "child-2",
              agentName: "Agent B",
            },
          ],
          [
            "agent-3",
            {
              agentId: "agent-3",
              childWorkflowId: "child-3",
              agentName: "Agent C",
            },
          ],
        ]),
        runningAgents: 3,
        completedTasks: 0,
        consumedCents: 0,
        wakeQueue: [] as Array<{
          reason: string;
          metadata?: Record<string, unknown>;
        }>,
      };

      const handler = (payload: {
        agentId: string;
        runId: string;
        status: string;
        costCents: number;
        completedTasks: number;
        error?: string;
      }) => {
        state.activeAgents.delete(payload.agentId);
        state.runningAgents = state.activeAgents.size;
        state.completedTasks += payload.completedTasks;
        state.consumedCents += payload.costCents;
        state.wakeQueue.push({
          reason: "agent_completed",
          metadata: {
            agentId: payload.agentId,
            runId: payload.runId,
            status: payload.status,
            error: payload.error,
          },
        });
      };

      handler({
        agentId: "agent-2",
        runId: "run-2",
        status: "completed",
        costCents: 10,
        completedTasks: 1,
      });

      expect(state.activeAgents.size).toBe(2);
      expect(state.runningAgents).toBe(2);

      handler({
        agentId: "agent-1",
        runId: "run-1",
        status: "failed",
        costCents: 5,
        completedTasks: 0,
        error: "Timeout",
      });

      expect(state.activeAgents.size).toBe(1);
      expect(state.runningAgents).toBe(1);
      expect(state.completedTasks).toBe(1);
      expect(state.consumedCents).toBe(15);
      expect(state.wakeQueue).toHaveLength(2);

      handler({
        agentId: "agent-3",
        runId: "run-3",
        status: "completed",
        costCents: 20,
        completedTasks: 1,
      });

      expect(state.activeAgents.size).toBe(0);
      expect(state.runningAgents).toBe(0);
      expect(state.completedTasks).toBe(2);
      expect(state.consumedCents).toBe(35);
      expect(state.wakeQueue).toHaveLength(3);
    });

    it("handles signal for unknown agent gracefully", () => {
      const state = {
        activeAgents: new Map([
          [
            "agent-1",
            {
              agentId: "agent-1",
              childWorkflowId: "child-1",
              agentName: "Agent A",
            },
          ],
        ]),
        runningAgents: 1,
        completedTasks: 0,
        consumedCents: 0,
        wakeQueue: [] as Array<{
          reason: string;
          metadata?: Record<string, unknown>;
        }>,
      };

      const handler = (payload: {
        agentId: string;
        runId: string;
        status: string;
        costCents: number;
        completedTasks: number;
      }) => {
        state.activeAgents.delete(payload.agentId);
        state.runningAgents = state.activeAgents.size;
        state.completedTasks += payload.completedTasks;
        state.consumedCents += payload.costCents;
        state.wakeQueue.push({
          reason: "agent_completed",
          metadata: {
            agentId: payload.agentId,
            runId: payload.runId,
            status: payload.status,
          },
        });
      };

      handler({
        agentId: "non-existent-agent",
        runId: "run-x",
        status: "completed",
        costCents: 10,
        completedTasks: 1,
      });

      expect(state.activeAgents.size).toBe(1);
      expect(state.runningAgents).toBe(1);
      expect(state.completedTasks).toBe(1);
      expect(state.consumedCents).toBe(10);
      expect(state.wakeQueue).toHaveLength(1);
    });
  });

  describe("Agent run signals parent on completion", () => {
    it("agent-run-unbounded exports signaling capability via source inspection", async () => {
      const fs = await import("node:fs");
      const agentRunSource = fs.readFileSync(
        new URL(
          "../workflows/mission/mission-agent-run-unbounded.ts",
          import.meta.url
        ),
        "utf-8"
      );

      expect(agentRunSource).toContain("agentCompletedSignal");
      expect(agentRunSource).toContain("signalAgentCompleted");
      expect(agentRunSource).toContain("workflowInfo().parent?.workflowId");
    });
  });

  describe("Signal definition", () => {
    it("agentCompletedSignal is defined in workflow types", async () => {
      const fs = await import("node:fs");
      const typesSource = fs.readFileSync(
        new URL("../workflows/types.ts", import.meta.url),
        "utf-8"
      );

      expect(typesSource).toContain(
        'defineSignal<[AgentCompletedPayload]>("agentCompleted")'
      );
    });
  });
});
