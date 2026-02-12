import type { Database } from "@openplane/db";
import { publishMissionTimelineEvent } from "@openplane/redis";
import type {
  ClaimTaskInput,
  ClaimTaskOutput,
  CompleteTaskInput,
  CompleteTaskOutput,
  CreateRunInput,
  CreateRunOutput,
  CreateTaskInput,
  CreateTaskOutput,
  FinalizeMissionInput,
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
  SendFeedbackInput,
  UpdateBudgetInput,
  UpdateBudgetOutput,
  UpdateRunInput,
  WriteMemoryInput,
} from "./types";

export interface MissionActivityDependencies {
  db: Database;
  publishTimelineEvent?: MissionTimelinePublisher;
}

export interface MissionTimelineEventInput {
  missionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

export type MissionTimelinePublisher = (
  event: MissionTimelineEventInput
) => Promise<void>;

type MissionTimelineEventPublishInput = Parameters<
  typeof publishMissionTimelineEvent
>[0];
type MissionTimelineEventPublisher = (
  event: MissionTimelineEventPublishInput
) => Promise<void>;

const EVENT_TYPE_ALIASES: Record<string, string> = {
  approval_requested: "approval.requested",
  approval_resolved: "approval.resolved",
  task_started: "task.claimed",
  task_completed: "task.completed",
  task_failed: "task.failed",
  run_started: "run.started",
  run_completed: "run.completed",
  run_failed: "run.failed",
  mission_started: "mission.started",
  mission_completed: "mission.completed",
  mission_failed: "mission.failed",
  mission_cancelled: "mission.cancelled",
  artifact_published: "artifact.published",
  tool_started: "tool.started",
  tool_completed: "tool.completed",
  tool_failed: "tool.failed",
};

const NOOP_TIMELINE_PUBLISHER: MissionTimelinePublisher = async () =>
  Promise.resolve();
const RUN_ID_CACHE_TTL_MS = 30_000;
const MAX_RUN_ID_CACHE_ENTRIES = 2000;

function normalizeMissionEventType(eventType: string): string {
  return EVENT_TYPE_ALIASES[eventType] ?? eventType;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function trimRunIdCache(
  runIdCache: Map<string, { runId: string | null; fetchedAt: number }>
): void {
  if (runIdCache.size <= MAX_RUN_ID_CACHE_ENTRIES) {
    return;
  }

  const overflow = runIdCache.size - MAX_RUN_ID_CACHE_ENTRIES;
  let removed = 0;
  for (const key of runIdCache.keys()) {
    runIdCache.delete(key);
    removed += 1;
    if (removed >= overflow) {
      return;
    }
  }
}

export function createMissionTimelinePublisher(
  db: Database,
  publishTimeline: MissionTimelineEventPublisher = publishMissionTimelineEvent
): MissionTimelinePublisher {
  const runIdCache = new Map<
    string,
    { runId: string | null; fetchedAt: number }
  >();

  async function resolveRunId(missionId: string): Promise<string | null> {
    const now = Date.now();
    const cached = runIdCache.get(missionId);
    if (cached && now - cached.fetchedAt < RUN_ID_CACHE_TTL_MS) {
      return cached.runId;
    }

    const mission = await db.mission.findUnique({
      where: { id: missionId },
      select: { runId: true },
    });
    const runId = mission?.runId ?? null;
    runIdCache.set(missionId, { runId, fetchedAt: now });
    trimRunIdCache(runIdCache);
    return runId;
  }

  return async ({ missionId, eventType, payload, timestamp }) => {
    const runId = await resolveRunId(missionId);
    if (!runId) {
      return;
    }

    await publishTimeline({
      missionId,
      runId,
      lane: "autonomous",
      eventType: normalizeMissionEventType(eventType),
      timestamp,
      payload: payload ?? {},
    });
  };
}

export function createMissionActivities(
  deps: MissionActivityDependencies
): MissionActivities {
  const { db } = deps;
  const publishTimelineEvent =
    deps.publishTimelineEvent ?? NOOP_TIMELINE_PUBLISHER;

  return {
    async refreshQueue(input: RefreshQueueInput): Promise<RefreshQueueOutput> {
      const allTasks = await db.missionTask.findMany({
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
          dependsOn: true,
          requiredCapabilities: true,
        },
      });

      const tasksWithDeps = allTasks.filter((t) => t.dependsOn.length > 0);
      let completedTaskIds = new Set<string>();

      if (tasksWithDeps.length > 0) {
        const allDepIds = [
          ...new Set(tasksWithDeps.flatMap((t) => t.dependsOn)),
        ];
        const doneTasks = await db.missionTask.findMany({
          where: { id: { in: allDepIds }, status: "DONE" },
          select: { id: true },
        });
        completedTaskIds = new Set(doneTasks.map((t) => t.id));
      }

      const readyTasks = allTasks.filter((task) =>
        task.dependsOn.every((depId) => completedTaskIds.has(depId))
      );

      return { tasks: readyTasks };
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

      const highestPriority = input.pendingTasks[0]?.priority;
      const eligibleTasks = highestPriority
        ? input.pendingTasks.filter((t) => t.priority === highestPriority)
        : input.pendingTasks;

      const dispatches: PlanDispatchOutput["dispatches"] = [];
      const assignedAgentIds = new Set<string>();

      for (const task of eligibleTasks.slice(0, slotsAvailable)) {
        const bestAgent = idleAgents
          .filter((a) => !assignedAgentIds.has(a.id))
          .map((agent) => ({
            agent,
            score: scoreAgentForTask(agent, task),
          }))
          .sort(
            (a, b) => b.score - a.score || a.agent.sortOrder - b.agent.sortOrder
          )[0];

        if (!bestAgent) {
          break;
        }

        assignedAgentIds.add(bestAgent.agent.id);
        dispatches.push({
          agentId: bestAgent.agent.id,
          agentName: bestAgent.agent.name,
          taskId: task.id,
          taskTitle: task.title,
          soulPrompt: bestAgent.agent.soulPrompt,
          tools: bestAgent.agent.tools,
        });
      }

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
      const mission = await db.mission.findUnique({
        where: { id: input.missionId },
        select: { teamId: true },
      });

      if (!mission || mission.teamId !== input.teamId) {
        throw new Error(
          `Mission ${input.missionId} does not belong to team ${input.teamId}`
        );
      }

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

      await publishTimelineEvent({
        missionId: input.missionId,
        eventType: "cost.updated",
        payload: {
          consumedCents: mission.consumedCents,
          budgetCents: mission.budgetCents,
          costCents: input.costCents,
        },
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
      const metadata = toRecord(input.metadata);
      const activity = await db.missionActivity.create({
        data: {
          missionId: input.missionId,
          type: input.type,
          message: input.message,
          agentId: input.agentId,
          metadata: metadata as never,
        },
      });

      await publishTimelineEvent({
        missionId: input.missionId,
        eventType: input.type,
        payload: {
          ...metadata,
          ...(input.agentId ? { agentId: input.agentId } : {}),
          summary: input.message,
        },
        timestamp:
          activity.createdAt instanceof Date
            ? activity.createdAt.getTime()
            : Date.now(),
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
      const data: Record<string, unknown> = { status: input.status };

      if (input.startedAt) {
        data.startedAt = new Date(input.startedAt);
      }
      if (input.completedAt) {
        data.completedAt = new Date(input.completedAt);
      }
      if (input.tokensUsed !== undefined) {
        data.tokensUsed = input.tokensUsed;
      }
      if (input.costCents !== undefined) {
        data.costCents = input.costCents;
      }
      if (input.artifacts !== undefined) {
        data.artifacts = input.artifacts;
      }
      if (input.error) {
        data.error = input.error;
      }

      await db.missionRun.update({
        where: { id: input.runId },
        data: data as never,
      });
    },

    async finalizeMission(input: FinalizeMissionInput): Promise<void> {
      await db.mission.update({
        where: { id: input.missionId },
        data: { status: input.status },
      });

      await publishTimelineEvent({
        missionId: input.missionId,
        eventType:
          input.status === "CANCELLED"
            ? "mission.cancelled"
            : "mission.completed",
        payload: { status: input.status },
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
    async createMissionTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
      const task = await db.missionTask.create({
        data: {
          missionId: input.missionId,
          title: input.title,
          description: input.description,
          priority: input.priority ?? "P2",
          dependsOn: input.dependsOn ?? [],
          requiredCapabilities: input.requiredCapabilities ?? [],
          createdById: input.agentId,
          requestId: `agent-${input.agentId}-${Date.now()}`,
        },
      });

      return { taskId: task.id };
    },

    async sendFeedback(input: SendFeedbackInput): Promise<void> {
      await db.missionComment.create({
        data: {
          taskId: input.taskId,
          fromAgentId: input.fromAgentId,
          content: input.feedback,
          mentions: input.targetAgentId ? [input.targetAgentId] : [],
        },
      });

      if (input.reopen) {
        await db.missionTask.update({
          where: { id: input.taskId },
          data: { status: "INBOX", assigneeId: null, completedAt: null },
        });
      }
    },
  };
}

function scoreAgentForTask(
  agent: { capabilities: string[] },
  task: { requiredCapabilities?: string[] }
): number {
  const required = task.requiredCapabilities ?? [];
  if (required.length === 0 || agent.capabilities.length === 0) {
    return 0;
  }

  const matches = required.filter((c) => agent.capabilities.includes(c)).length;
  return matches / required.length;
}

export type { MissionActivities } from "./types";
