import { describe, expect, it } from "bun:test";
import type { Database } from "@openplane/db";
import {
  BackgroundAgentsServiceError,
  cancelResearchWorkflowForTeam,
  createBackgroundAgentForTeam,
  getResearchProgressForTeam,
  listBackgroundAgentsForTeam,
  pauseBackgroundAgentForTeam,
  startResearchWorkflowForTeam,
} from "../background-agents";

function createDatabaseStub(options?: {
  status?:
    | "PENDING"
    | "INITIALIZING"
    | "RUNNING"
    | "PAUSED"
    | "AWAITING_INPUT"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "TIMED_OUT";
  hasAgent?: boolean;
  cancelCount?: number;
}) {
  const status = options?.status ?? "RUNNING";
  const hasAgent = options?.hasAgent ?? true;
  const cancelCount = options?.cancelCount ?? 1;

  return {
    backgroundAgent: {
      findMany: async () => [
        {
          id: "agent_1",
          name: "Agent",
          status,
          progress: 10,
          currentStep: "Thinking",
          preset: "researcher",
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          startedAt: null,
          completedAt: null,
          createdAt: new Date("2026-02-15T00:00:00.000Z"),
          updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        },
      ],
      count: async () => 1,
      create: async (input: {
        data: {
          teamId: string;
          userId: string;
          name: string;
          prompt: string;
          preset: string;
          totalSteps?: number;
          sandboxType?: string;
          description?: string;
          repositoryUrl?: string;
          baseBranch?: string;
          timeoutAt: Date;
          maxRetries: number;
        };
      }) => ({
        id: "agent_2",
        teamId: input.data.teamId,
        userId: input.data.userId,
        name: input.data.name,
        status: "PENDING",
        prompt: input.data.prompt,
        progress: 0,
        currentStep: null,
        startedAt: null,
        completedAt: null,
        errorCode: null,
        errorMessage: null,
        artifacts: [],
        output: null,
        pullRequestUrl: null,
      }),
      findFirst: async () =>
        hasAgent
          ? {
              id: "agent_1",
              teamId: "team_1",
              status,
              progress: 42,
              currentStep: "Collecting",
              startedAt: new Date("2026-02-15T00:00:00.000Z"),
              completedAt: null,
              errorCode: null,
              errorMessage: null,
              artifacts: [{ id: "artifact_1" }],
              output: "done",
              pullRequestUrl: null,
            }
          : null,
      updateMany: async () => ({ count: cancelCount }),
      deleteMany: async () => ({ count: 1 }),
    },
    backgroundAgentLog: {
      findMany: async () => [],
    },
  } as unknown as Database;
}

describe("background agents service", () => {
  it("lists background agents with pagination", async () => {
    const db = {
      ...createDatabaseStub(),
      backgroundAgent: {
        ...createDatabaseStub().backgroundAgent,
        findMany: async () => [
          {
            id: "agent_1",
            name: "Agent 1",
            status: "RUNNING",
            progress: 10,
            currentStep: null,
            preset: "researcher",
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
            startedAt: null,
            completedAt: null,
            createdAt: new Date("2026-02-15T00:00:00.000Z"),
            updatedAt: new Date("2026-02-15T00:00:00.000Z"),
          },
          {
            id: "agent_2",
            name: "Agent 2",
            status: "RUNNING",
            progress: 20,
            currentStep: null,
            preset: "researcher",
            inputTokens: 0,
            outputTokens: 0,
            estimatedCostUsd: 0,
            startedAt: null,
            completedAt: null,
            createdAt: new Date("2026-02-15T00:00:00.000Z"),
            updatedAt: new Date("2026-02-15T00:00:00.000Z"),
          },
        ],
      },
    } as unknown as Database;

    const result = await listBackgroundAgentsForTeam(db, {
      teamId: "team_1",
      status: "RUNNING",
      limit: 1,
      offset: 0,
    });

    expect(result.items.length).toBe(1);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(1);
  });

  it("creates background agent for session actor", async () => {
    const db = createDatabaseStub();

    const created = await createBackgroundAgentForTeam(db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      name: "Analyzer",
      prompt: "Analyze this",
      preset: "analyst",
      sandboxType: "daytona",
    });

    expect(created.id).toBe("agent_2");
    expect(created.status).toBe("PENDING");
  });

  it("fails pause when agent is not running", async () => {
    const db = createDatabaseStub({ status: "PAUSED" });

    await expect(
      pauseBackgroundAgentForTeam(db, {
        teamId: "team_1",
        agentId: "agent_1",
      })
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("starts research workflow", async () => {
    const db = createDatabaseStub();

    const workflow = await startResearchWorkflowForTeam(db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      prompt: "Find docs",
      maxSteps: 12,
    });

    expect(workflow.workflowId).toBe("agent_2");
    expect(workflow.status).toBe("PENDING");
  });

  it("returns progress for existing workflow", async () => {
    const db = createDatabaseStub();

    const progress = await getResearchProgressForTeam(db, {
      teamId: "team_1",
      workflowId: "agent_1",
    });

    expect(progress.workflowId).toBe("agent_1");
    expect(progress.status).toBe("RUNNING");
  });

  it("cancels research workflow", async () => {
    const db = createDatabaseStub({ status: "RUNNING", cancelCount: 1 });

    const result = await cancelResearchWorkflowForTeam(db, {
      teamId: "team_1",
      workflowId: "agent_1",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("CANCELLED");
  });

  it("returns not found for missing workflow", async () => {
    const db = createDatabaseStub({ hasAgent: false });

    await expect(
      getResearchProgressForTeam(db, {
        teamId: "team_1",
        workflowId: "missing",
      })
    ).rejects.toBeInstanceOf(BackgroundAgentsServiceError);
  });
});
