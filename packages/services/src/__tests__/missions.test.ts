import { describe, expect, it } from "bun:test";
import type { Database } from "@openplane/db";
import {
  broadcastMissionForTeam,
  createMissionForTeam,
  getMissionStartContextForTeam,
  listMissionsForTeam,
  MissionServiceError,
  spawnMissionAgentForTeam,
} from "../missions";

function createDatabaseStub(options?: {
  hasMission?: boolean;
  missionStatus?:
    | "DRAFT"
    | "ACTIVE"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED"
    | "ARCHIVED";
  hasTeamUser?: boolean;
  hasTask?: boolean;
  workflowId?: string | null;
}) {
  const hasMission = options?.hasMission ?? true;
  const missionStatus = options?.missionStatus ?? "ACTIVE";
  const hasTeamUser = options?.hasTeamUser ?? true;
  const hasTask = options?.hasTask ?? true;
  const workflowId = options?.workflowId ?? "wf_1";

  const missionRecord = hasMission
    ? {
        id: "mission_1",
        name: "Mission",
        objective: "Ship quality",
        status: missionStatus,
        teamId: "team_1",
        createdById: "user_1",
        budgetCents: 1000,
        consumedCents: 50,
        maxConcurrentRuns: 3,
        heartbeatIntervalMin: 2,
        workflowId,
        runId: "run_1",
        cronSchedule: null,
        isRecurring: false,
        timezone: "UTC",
        nextRunAt: null,
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
        updatedAt: new Date("2026-02-15T00:00:00.000Z"),
        agents: [],
        tasks: [{ status: "DONE" }, { status: "INBOX" }],
        activities: [],
        _count: { agents: 1 },
        runs: [{ costCents: 10 }, { costCents: 20 }],
      }
    : null;

  const mission = {
    findMany: async () => [missionRecord, missionRecord].filter(Boolean),
    findFirst: async () => missionRecord,
    create: async (input: {
      data: {
        teamId: string;
        createdById: string;
        name: string;
        objective: string;
      };
    }) => ({
      id: "mission_2",
      status: "DRAFT",
      maxConcurrentRuns: 3,
      heartbeatIntervalMin: 2,
      budgetCents: null,
      ...input.data,
    }),
    update: async (input: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => ({
      id: input.where.id,
      ...input.data,
    }),
  };

  const missionTask = {
    findFirst: async () => (hasTask ? { id: "task_1" } : null),
    update: async (input: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => ({ id: input.where.id, ...input.data }),
    upsert: async () => ({ id: "task_new" }),
  };

  return {
    mission,
    missionTask,
    missionActivity: {
      create: async () => ({ id: "activity_1" }),
    },
    usersOnTeam: {
      findFirst: async () => (hasTeamUser ? { userId: "user_1" } : null),
    },
    $transaction: async (
      callback: (tx: {
        backgroundAgent: {
          create: (input: {
            data: { teamId: string; userId: string; name: string };
          }) => Promise<{ id: string }>;
        };
        missionAgent: {
          create: (input: {
            data: {
              missionId: string;
              agentId: string;
              name: string;
              role: string;
              soulPrompt: string;
              level: string;
              sortOrder: number;
              tools: string[];
              capabilities: string[];
            };
          }) => Promise<{ id: string; agentId: string }>;
        };
      }) => Promise<unknown>
    ) =>
      callback({
        backgroundAgent: {
          create: async () => ({ id: "bg_1" }),
        },
        missionAgent: {
          create: async (input) => ({
            id: "mission_agent_1",
            agentId: input.data.agentId,
          }),
        },
      }),
  } as unknown as Database;
}

describe("missions service", () => {
  it("lists missions with summary projection", async () => {
    const db = createDatabaseStub();

    const result = await listMissionsForTeam(db, {
      teamId: "team_1",
      status: "ACTIVE",
      limit: 1,
      offset: 0,
    });

    expect(result.items.length).toBe(1);
    expect(result.items[0]?.totalCostCents).toBe(30);
    expect(result.hasMore).toBe(true);
  });

  it("creates mission for session actor", async () => {
    const db = createDatabaseStub();

    const mission = await createMissionForTeam(db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      objective: "Launch",
      maxConcurrentRuns: 3,
    });

    expect(mission.id).toBe("mission_2");
  });

  it("rejects start context for invalid status", async () => {
    const db = createDatabaseStub({ missionStatus: "PAUSED" });

    await expect(
      getMissionStartContextForTeam(db, {
        teamId: "team_1",
        missionId: "mission_1",
      })
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });

  it("spawns mission agent and creates task when task id not supplied", async () => {
    const db = createDatabaseStub({
      missionStatus: "ACTIVE",
      workflowId: "wf_1",
    });

    const result = await spawnMissionAgentForTeam(db, {
      teamId: "team_1",
      missionId: "mission_1",
      authContext: { type: "session", userId: "user_1" },
      name: "Research Bot",
      role: "researcher",
      tools: ["search"],
    });

    expect(result.success).toBe(true);
    expect(result.agentId).toBe("mission_agent_1");
    expect(result.taskId).toBe("task_new");
    expect(result.wakeRequest?.reason).toBe("manual");
  });

  it("returns task not found for invalid task id", async () => {
    const db = createDatabaseStub({ hasTask: false, missionStatus: "ACTIVE" });

    await expect(
      spawnMissionAgentForTeam(db, {
        teamId: "team_1",
        missionId: "mission_1",
        authContext: { type: "session", userId: "user_1" },
        name: "Research Bot",
        role: "researcher",
        tools: ["search"],
        taskId: "missing_task",
      })
    ).rejects.toMatchObject({
      code: "TASK_NOT_FOUND",
    });
  });

  it("rejects broadcast for inactive mission", async () => {
    const db = createDatabaseStub({ missionStatus: "DRAFT" });

    await expect(
      broadcastMissionForTeam(db, {
        teamId: "team_1",
        missionId: "mission_1",
        authContext: { type: "session", userId: "user_1" },
        content: "Hello",
      })
    ).rejects.toBeInstanceOf(MissionServiceError);
  });
});
