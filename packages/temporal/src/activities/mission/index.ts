import type { Database } from "@openplane/db";
import type {
  ClaimTaskInput,
  ClaimTaskOutput,
  CompleteTaskInput,
  CompleteTaskOutput,
  CreateRunInput,
  CreateRunOutput,
  GetMissionStatsInput,
  LoadMissionContextInput,
  LoadMissionContextOutput,
  LogActivityInput,
  MissionActivities,
  MissionStatsOutput,
  PlanDispatchInput,
  PlanDispatchOutput,
  PostCommentInput,
  ReadMemoryInput,
  RefreshQueueInput,
  RefreshQueueOutput,
  UpdateBudgetInput,
  UpdateBudgetOutput,
  UpdateRunInput,
  WriteMemoryInput,
} from "./types";

export interface MissionActivityDependencies {
  db: Database;
}

export function createMissionActivities(
  deps: MissionActivityDependencies
): MissionActivities {
  const { db } = deps;

  return {
    async refreshQueue(input: RefreshQueueInput): Promise<RefreshQueueOutput> {
      const tasks = await db.missionTask.findMany({
        where: {
          missionId: input.missionId,
          status: { in: ["INBOX", "ASSIGNED"] },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          title: true,
          priority: true,
          assigneeId: true,
        },
      });

      return { tasks };
    },

    async planDispatch(input: PlanDispatchInput): Promise<PlanDispatchOutput> {
      const busyAgentIds = await db.missionRun.findMany({
        where: { missionId: input.missionId, status: "RUNNING" },
        select: { agentId: true },
        distinct: ["agentId"],
      });

      const busyIds = new Set(busyAgentIds.map((r) => r.agentId));

      const allAgents = await db.missionAgent.findMany({
        where: { missionId: input.missionId },
        orderBy: { sortOrder: "asc" },
      });

      const idleAgents = allAgents.filter((a) => !busyIds.has(a.id));

      const runningCount = busyIds.size;
      const slotsAvailable = Math.max(
        0,
        input.maxConcurrentRuns - runningCount
      );

      const dispatches = input.pendingTasks
        .slice(0, Math.min(slotsAvailable, idleAgents.length))
        .flatMap((task, i) => {
          const agent = idleAgents[i];
          if (!agent) {
            return [];
          }
          return [
            {
              agentId: agent.id,
              agentName: agent.name,
              taskId: task.id,
              taskTitle: task.title,
              soulPrompt: agent.soulPrompt,
            },
          ];
        });

      return { dispatches };
    },

    async claimTask(input: ClaimTaskInput): Promise<ClaimTaskOutput> {
      const result = await db.missionTask.updateMany({
        where: {
          id: input.taskId,
          status: { in: ["INBOX", "ASSIGNED"] },
        },
        data: {
          status: "IN_PROGRESS",
          assigneeId: input.agentId,
          claimedAt: new Date(),
        },
      });

      return { claimed: result.count > 0 };
    },

    async completeTask(input: CompleteTaskInput): Promise<CompleteTaskOutput> {
      const result = await db.missionTask.updateMany({
        where: {
          id: input.taskId,
          assigneeId: input.agentId,
          status: "IN_PROGRESS",
        },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

      return { completed: result.count > 0 };
    },

    async loadMissionContext(
      input: LoadMissionContextInput
    ): Promise<LoadMissionContextOutput> {
      const [agent, task, memories, comments] = await Promise.all([
        db.missionAgent.findFirst({
          where: { id: input.agentId, missionId: input.missionId },
        }),
        db.missionTask.findUnique({
          where: { id: input.taskId },
        }),
        db.missionMemory.findMany({
          where: {
            missionId: input.missionId,
            OR: [
              { agentId: input.agentId },
              { agentId: null },
              { agentId: "" },
            ],
          },
        }),
        db.missionComment.findMany({
          where: {
            task: { missionId: input.missionId },
            mentions: { has: input.agentId },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            task: { select: { title: true } },
          },
        }),
      ]);

      const memoryMap: Record<string, unknown> = {};
      for (const mem of memories) {
        memoryMap[`${mem.scope}:${mem.key}`] = mem.value;
      }

      return {
        context: {
          soulPrompt: agent?.soulPrompt ?? "",
          taskTitle: task?.title ?? "",
          taskDescription: task?.description ?? null,
          memory: memoryMap,
          recentComments: comments.map((c) => ({
            content: c.content,
            taskTitle: c.task?.title ?? null,
          })),
        },
      };
    },

    async postComment(input: PostCommentInput): Promise<void> {
      await db.missionComment.create({
        data: {
          taskId: input.taskId,
          fromAgentId: input.fromAgentId,
          content: input.content,
          mentions: input.mentions ?? [],
        },
      });
    },

    async updateBudget(input: UpdateBudgetInput): Promise<UpdateBudgetOutput> {
      const mission = await db.mission.update({
        where: { id: input.missionId },
        data: {
          consumedCents: { increment: input.costCents },
        },
        select: { consumedCents: true, budgetCents: true },
      });

      return {
        consumedCents: mission.consumedCents,
        budgetCents: mission.budgetCents,
        exceeded:
          mission.budgetCents !== null &&
          mission.consumedCents > mission.budgetCents,
      };
    },

    async logActivity(input: LogActivityInput): Promise<void> {
      await db.missionActivity.create({
        data: {
          missionId: input.missionId,
          type: input.type,
          message: input.message,
          agentId: input.agentId,
          metadata: (input.metadata ?? {}) as never,
        },
      });
    },

    async readMemory(input: ReadMemoryInput): Promise<unknown> {
      const memory = await db.missionMemory.findUnique({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: input.agentId ?? "",
            key: input.key,
            scope: input.scope ?? "mission",
          },
        },
      });

      return memory?.value ?? null;
    },

    async writeMemory(input: WriteMemoryInput): Promise<void> {
      const scope = input.scope ?? "mission";
      await db.missionMemory.upsert({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: input.agentId ?? "",
            key: input.key,
            scope,
          },
        },
        create: {
          missionId: input.missionId,
          agentId: input.agentId,
          key: input.key,
          value: input.value as never,
          scope,
        },
        update: {
          value: input.value as never,
        },
      });
    },

    async createRun(input: CreateRunInput): Promise<CreateRunOutput> {
      const run = await db.missionRun.create({
        data: {
          missionId: input.missionId,
          taskId: input.taskId,
          agentId: input.agentId,
          workflowId: input.workflowId,
        },
      });

      return { runId: run.id };
    },

    async updateRun(input: UpdateRunInput): Promise<void> {
      await db.missionRun.update({
        where: { id: input.runId },
        data: {
          status: input.status,
          ...(input.startedAt ? { startedAt: new Date(input.startedAt) } : {}),
          ...(input.completedAt
            ? { completedAt: new Date(input.completedAt) }
            : {}),
          ...(input.tokensUsed !== undefined
            ? { tokensUsed: input.tokensUsed }
            : {}),
          ...(input.costCents !== undefined
            ? { costCents: input.costCents }
            : {}),
          ...(input.error ? { error: input.error } : {}),
        },
      });
    },

    async getMissionStats(
      input: GetMissionStatsInput
    ): Promise<MissionStatsOutput> {
      const [taskCounts, runningRuns, totalRuns, mission] = await Promise.all([
        db.missionTask.groupBy({
          by: ["status"],
          where: { missionId: input.missionId },
          _count: { id: true },
        }),
        db.missionRun.count({
          where: { missionId: input.missionId, status: "RUNNING" },
        }),
        db.missionRun.count({
          where: { missionId: input.missionId },
        }),
        db.mission.findUnique({
          where: { id: input.missionId },
          select: { consumedCents: true, budgetCents: true },
        }),
      ]);

      const statusMap = Object.fromEntries(
        taskCounts.map((r) => [r.status, r._count.id])
      );

      return {
        tasks: {
          inbox: statusMap.INBOX ?? 0,
          assigned: statusMap.ASSIGNED ?? 0,
          inProgress: statusMap.IN_PROGRESS ?? 0,
          review: statusMap.REVIEW ?? 0,
          done: statusMap.DONE ?? 0,
          blocked: statusMap.BLOCKED ?? 0,
          cancelled: statusMap.CANCELLED ?? 0,
        },
        runs: {
          running: runningRuns,
          total: totalRuns,
        },
        budget: {
          consumed: mission?.consumedCents ?? 0,
          limit: mission?.budgetCents ?? null,
        },
      };
    },
  };
}

export type { MissionActivities };
export type {
  ClaimTaskInput,
  ClaimTaskOutput,
  CompleteTaskInput,
  CompleteTaskOutput,
  CreateRunInput,
  CreateRunOutput,
  GetMissionStatsInput,
  LoadMissionContextInput,
  LoadMissionContextOutput,
  LogActivityInput,
  MissionStatsOutput,
  PlanDispatchInput,
  PlanDispatchOutput,
  PostCommentInput,
  ReadMemoryInput,
  RefreshQueueInput,
  RefreshQueueOutput,
  UpdateBudgetInput,
  UpdateBudgetOutput,
  UpdateRunInput,
  WriteMemoryInput,
} from "./types";
