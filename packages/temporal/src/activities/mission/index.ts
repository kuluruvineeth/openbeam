import { randomUUID } from "node:crypto";
import type { Database } from "@openplane/db";
import { publishMissionTimelineEvent } from "@openplane/redis";
import {
  CrossMissionDelegationRequestSchema,
  CrossMissionSignalPayloadSchema,
} from "@openplane/types/temporal/cross-mission";
import {
  type SandboxConfig,
  SandboxConfigSchema,
  type SpawnAgentRequest,
  SpawnAgentRequestSchema,
  SpawnAgentSignalPayloadSchema,
  SpawnedAgentBlueprintSchema,
  SpawnLimitsSchema,
  SpawnRegistryEntrySchema,
  type SpawnValidationResult,
  SpawnValidationResultSchema,
} from "@openplane/types/temporal/mission";
import { getTemporalClient } from "../../client";
import { crossMissionSignal, spawnAgentSignal } from "../../workflows/types";
import { createDiscoveryActivities } from "./discovery";
import {
  fetchAgentInbox,
  routeAgentMessage,
  waitForAgentReply,
} from "./messaging";
import { createTeamKnowledgeActivities } from "./team-knowledge";
import type {
  BrowseInboxInput,
  BrowseInboxOutput,
  CheckReviewGatingInput,
  CheckReviewGatingOutput,
  ClaimTaskInput,
  ClaimTaskOutput,
  CompleteTaskInput,
  CompleteTaskOutput,
  CreateRunInput,
  CreateRunOutput,
  CreateSpawnedAgentInput,
  CreateSpawnedAgentOutput,
  CreateTaskInput,
  CreateTaskOutput,
  FinalizeMissionInput,
  GenerateSpawnedSoulPromptInput,
  GenerateSpawnedSoulPromptOutput,
  GetMissionAgentsInput,
  GetMissionAgentsOutput,
  GetMissionStatsInput,
  GetSpawnTreeInput,
  GetSpawnTreeOutput,
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
  RequestAgentSpawnInput,
  RequestAgentSpawnOutput,
  SelectReviewerInput,
  SelectReviewerOutput,
  SendFeedbackInput,
  UpdateBudgetInput,
  UpdateBudgetOutput,
  UpdateRunInput,
  ValidateAgentClaimInput,
  ValidateAgentClaimOutput,
  ValidateSpawnRequestInput,
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

const CAPABILITY_TOOL_MAP: Record<string, string[]> = {
  research: ["mission_query_capabilities", "mission_send_message"],
  planning: ["mission_query_capabilities", "mission_send_message"],
  coordination: [
    "mission_send_message",
    "mission_wait_for_reply",
    "mission_get_inbox",
  ],
  communication: [
    "mission_send_message",
    "mission_wait_for_reply",
    "mission_get_inbox",
  ],
};

const DEFAULT_SPAWN_TOOLS = [
  "mission_send_message",
  "mission_wait_for_reply",
  "mission_get_inbox",
  "mission_query_capabilities",
];

function normalizeCapability(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function toDisplayCapability(value: string): string {
  return value
    .split("_")
    .filter((segment) => segment.length > 0)
    .map(capitalize)
    .join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function buildToolSet(
  requiredCapabilities: string[],
  suggestedTools: string[] | undefined
): string[] {
  if (suggestedTools && suggestedTools.length > 0) {
    return uniqueStrings(suggestedTools);
  }

  const fromCapabilities = requiredCapabilities.flatMap(
    (capability) => CAPABILITY_TOOL_MAP[normalizeCapability(capability)] ?? []
  );

  return uniqueStrings([...DEFAULT_SPAWN_TOOLS, ...fromCapabilities]);
}

function buildSpawnedPrompt(
  name: string,
  role: string,
  request: SpawnAgentRequest
): string {
  const capabilities = request.requiredCapabilities
    .map((capability) => toDisplayCapability(normalizeCapability(capability)))
    .join(", ");
  const contextSection = request.context
    ? `\n\nAdditional context:\n${request.context}`
    : "";
  return [
    `You are ${name}.`,
    `Role: ${role}.`,
    `Primary task: ${request.taskDescription}`,
    `Required capabilities: ${capabilities}.`,
    "You are a focused specialist agent. Stay within scope, report concise progress, and produce verifiable outputs.",
    contextSection,
  ]
    .filter((segment) => segment.length > 0)
    .join("\n");
}

async function resolveSpawnDepth(
  db: Database,
  missionId: string,
  agentId: string
): Promise<number> {
  let depth = 0;
  let currentAgentId = agentId;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(currentAgentId)) {
      return depth;
    }
    visited.add(currentAgentId);

    const currentAgent = await db.missionAgent.findFirst({
      where: { missionId, id: currentAgentId },
      select: { id: true, level: true },
    });

    if (!currentAgent || currentAgent.level !== "spawned") {
      return depth;
    }

    depth += 1;

    const seedTask = await db.missionTask.findFirst({
      where: { missionId, assigneeId: currentAgent.id },
      orderBy: { createdAt: "asc" },
      select: { createdById: true },
    });

    if (!seedTask || seedTask.createdById === currentAgent.id) {
      return depth;
    }

    currentAgentId = seedTask.createdById;
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
  const discoveryActivities = createDiscoveryActivities({ db });
  const teamKnowledgeActivities = createTeamKnowledgeActivities({ db });

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

      const sandboxConfigRows =
        allAgents.length === 0
          ? []
          : await db.missionMemory.findMany({
              where: {
                missionId: input.missionId,
                scope: "agent",
                key: "sandbox_config",
                agentId: { in: allAgents.map((agent) => agent.id) },
              },
              select: {
                agentId: true,
                value: true,
              },
            });

      const sandboxConfigByAgentId = new Map<string, SandboxConfig>();
      for (const row of sandboxConfigRows) {
        if (!row.agentId) {
          continue;
        }
        const parsed = SandboxConfigSchema.safeParse(row.value);
        if (!parsed.success) {
          continue;
        }
        sandboxConfigByAgentId.set(row.agentId, parsed.data);
      }

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
        const availableAgents = idleAgents.filter(
          (agent) => !assignedAgentIds.has(agent.id)
        );

        if (availableAgents.length === 0) {
          break;
        }

        if (task.assigneeId) {
          const assignedAgent = availableAgents.find(
            (agent) => agent.id === task.assigneeId
          );
          if (!assignedAgent) {
            continue;
          }

          assignedAgentIds.add(assignedAgent.id);
          dispatches.push({
            agentId: assignedAgent.id,
            agentName: assignedAgent.name,
            taskId: task.id,
            taskTitle: task.title,
            soulPrompt: assignedAgent.soulPrompt,
            tools: assignedAgent.tools,
            sandboxConfig: sandboxConfigByAgentId.get(assignedAgent.id),
          });
          continue;
        }

        const bestAgent = availableAgents
          .map((agent) => ({
            agent,
            score: scoreAgentForTask(agent, task),
          }))
          .sort(
            (a, b) => b.score - a.score || a.agent.sortOrder - b.agent.sortOrder
          )[0];

        if (!bestAgent) {
          continue;
        }

        assignedAgentIds.add(bestAgent.agent.id);
        dispatches.push({
          agentId: bestAgent.agent.id,
          agentName: bestAgent.agent.name,
          taskId: task.id,
          taskTitle: task.title,
          soulPrompt: bestAgent.agent.soulPrompt,
          tools: bestAgent.agent.tools,
          sandboxConfig: sandboxConfigByAgentId.get(bestAgent.agent.id),
        });
      }

      return { dispatches };
    },

    async browseInbox(input: BrowseInboxInput): Promise<BrowseInboxOutput> {
      const limit = Math.min(input.limit ?? 10, 20);

      const completedDepIds = new Set<string>();
      const inboxTasks = await db.missionTask.findMany({
        where: {
          missionId: input.missionId,
          status: "INBOX",
          assigneeId: null,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: limit * 2,
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          requiredCapabilities: true,
          dependsOn: true,
          createdAt: true,
        },
      });

      const tasksWithDeps = inboxTasks.filter((t) => t.dependsOn.length > 0);
      if (tasksWithDeps.length > 0) {
        const allDepIds = [
          ...new Set(tasksWithDeps.flatMap((t) => t.dependsOn)),
        ];
        const doneTasks = await db.missionTask.findMany({
          where: { id: { in: allDepIds }, status: "DONE" },
          select: { id: true },
        });
        for (const t of doneTasks) {
          completedDepIds.add(t.id);
        }
      }

      const readyTasks = inboxTasks.filter((task) =>
        task.dependsOn.every((depId) => completedDepIds.has(depId))
      );

      return {
        tasks: readyTasks.slice(0, limit).map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority as "P0" | "P1" | "P2" | "P3",
          requiredCapabilities: task.requiredCapabilities,
          dependsOn: task.dependsOn,
          createdAt: task.createdAt.getTime(),
        })),
      };
    },

    async validateAgentClaim(
      input: ValidateAgentClaimInput
    ): Promise<ValidateAgentClaimOutput> {
      if (
        input.budgetCents !== undefined &&
        input.consumedCents >= input.budgetCents
      ) {
        return { approved: false, reason: "Mission budget exhausted" };
      }

      if (input.currentRunningAgents >= input.maxConcurrentRuns) {
        return {
          approved: false,
          reason: `Concurrency limit reached (${input.maxConcurrentRuns})`,
        };
      }

      const task = await db.missionTask.findFirst({
        where: {
          id: input.taskId,
          missionId: input.missionId,
          status: "INBOX",
          assigneeId: null,
        },
        select: { id: true },
      });

      if (!task) {
        return {
          approved: false,
          reason: "Task not available for claiming",
        };
      }

      const agent = await db.missionAgent.findFirst({
        where: { id: input.agentId, missionId: input.missionId },
        select: { id: true },
      });

      if (!agent) {
        return {
          approved: false,
          reason: "Agent not found in mission roster",
        };
      }

      return { approved: true, reason: "Claim approved" };
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
      if (input.requestId) {
        const existingTask = await db.missionTask.findUnique({
          where: { requestId: input.requestId },
          select: { id: true, missionId: true },
        });

        if (existingTask && existingTask.missionId === input.missionId) {
          return { taskId: existingTask.id };
        }
      }

      const task = await db.missionTask.create({
        data: {
          missionId: input.missionId,
          title: input.title,
          description: input.description,
          priority: input.priority ?? "P2",
          dependsOn: input.dependsOn ?? [],
          requiredCapabilities: input.requiredCapabilities ?? [],
          createdById: input.agentId,
          requestId: input.requestId ?? `agent-${input.agentId}-${Date.now()}`,
        },
      });

      return { taskId: task.id };
    },

    async sendFeedback(input: SendFeedbackInput): Promise<void> {
      const isValidAgentRef =
        input.fromAgentId && input.fromAgentId !== "system";

      await db.missionComment.create({
        data: {
          taskId: input.taskId,
          fromAgentId: isValidAgentRef ? input.fromAgentId : null,
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

    registerMissionCapabilities(input): Promise<void> {
      return discoveryActivities.registerMissionCapabilities(input);
    },

    discoverMissions(input) {
      return discoveryActivities.discoverMissions(input);
    },

    async delegateTaskToMission(input) {
      if (input.sourceMissionId === input.targetMissionId) {
        return {
          requestId: "",
          accepted: false,
          reason: "Source and target mission must be different",
        };
      }

      const targetMission = await db.mission.findUnique({
        where: { id: input.targetMissionId },
        select: { id: true, teamId: true, status: true },
      });

      if (!targetMission) {
        return {
          requestId: "",
          accepted: false,
          reason: "Target mission not found",
        };
      }

      if (targetMission.teamId !== input.teamId) {
        return {
          requestId: "",
          accepted: false,
          reason: "Target mission does not belong to team",
        };
      }

      if (targetMission.status !== "ACTIVE") {
        return {
          requestId: "",
          accepted: false,
          reason: "Target mission is not active",
        };
      }

      const requestId = randomUUID();
      const delegation = CrossMissionDelegationRequestSchema.parse({
        requestId,
        sourceMissionId: input.sourceMissionId,
        sourceTeamId: input.teamId,
        taskTitle: input.taskTitle,
        taskDescription: input.taskDescription,
        requiredCapabilities: input.requiredCapabilities,
        priority: input.priority,
        timeoutMs: input.timeoutMs,
        context: input.context,
      });

      const payload = CrossMissionSignalPayloadSchema.parse({
        type: "delegation_request",
        delegation,
      });

      try {
        const client = await getTemporalClient();
        const targetHandle = client.workflow.getHandle(
          `mission:${input.targetMissionId}`
        );
        await targetHandle.signal(crossMissionSignal, payload);
        return { requestId, accepted: true };
      } catch {
        return {
          requestId,
          accepted: false,
          reason: "Delegation signal delivery failed",
        };
      }
    },

    queryTeamKnowledge(input) {
      return teamKnowledgeActivities.queryTeamKnowledge(input);
    },

    storeTeamKnowledge(input) {
      return teamKnowledgeActivities.storeTeamKnowledge(input);
    },

    async notifyLeaseGranted(input): Promise<void> {
      const payload = CrossMissionSignalPayloadSchema.parse({
        type: "agent_lease_granted",
        lease: {
          agentId: input.grant.agentId,
          agentName: input.grant.agentName,
          leasedToMissionId: input.missionId,
          leaseExpiresAt: input.grant.leaseExpiresAt,
          taskId: input.grant.requestId,
        },
      });

      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(`mission:${input.missionId}`);
      await handle.signal(crossMissionSignal, payload);
    },

    async notifyLeaseExpired(input): Promise<void> {
      const payload = CrossMissionSignalPayloadSchema.parse({
        type: "agent_lease_revoked",
        agentId: input.agentId,
        reason: "lease_expired",
      });

      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(`mission:${input.missionId}`);
      await handle.signal(crossMissionSignal, payload);
    },

    async notifyLeaseDenied(input): Promise<void> {
      const payload = CrossMissionSignalPayloadSchema.parse({
        type: "agent_lease_denied",
        requestId: input.requestId,
        reason: input.reason,
      });

      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(`mission:${input.missionId}`);
      await handle.signal(crossMissionSignal, payload);
    },

    async requestAgentSpawn(
      input: RequestAgentSpawnInput
    ): Promise<RequestAgentSpawnOutput> {
      const request = SpawnAgentRequestSchema.parse({
        requestingAgentId: input.requestingAgentId,
        taskDescription: input.taskDescription,
        requiredCapabilities: input.requiredCapabilities,
        suggestedTools: input.suggestedTools,
        priority: input.priority,
        maxSteps: input.maxSteps,
        budgetCentsLimit: input.budgetCentsLimit,
        dependsOnTaskId: input.dependsOnTaskId,
        context: input.context,
        sandboxConfig: input.sandboxConfig,
      });
      const payload = SpawnAgentSignalPayloadSchema.parse({
        requestId: input.requestId,
        request,
      });

      let delivered = false;
      try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(
          input.orchestratorWorkflowId ?? `mission:${input.missionId}`
        );
        await handle.signal(spawnAgentSignal, payload);
        delivered = true;
      } catch {
        delivered = false;
      }

      return { requestId: input.requestId, delivered };
    },

    async getMissionAgents(
      input: GetMissionAgentsInput
    ): Promise<GetMissionAgentsOutput> {
      const agents = await db.missionAgent.findMany({
        where: { missionId: input.missionId },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          level: true,
          capabilities: true,
          tools: true,
        },
      });

      return { agents };
    },

    async getSpawnTree(input: GetSpawnTreeInput): Promise<GetSpawnTreeOutput> {
      const spawnedAgents = await db.missionAgent.findMany({
        where: { missionId: input.missionId, level: "spawned" },
        orderBy: [{ sortOrder: "asc" }],
        select: {
          id: true,
          name: true,
          capabilities: true,
          sortOrder: true,
        },
      });

      if (spawnedAgents.length === 0) {
        return { entries: [] };
      }

      const agentIds = spawnedAgents.map((a) => a.id);

      const [tasks, runs] = await Promise.all([
        db.missionTask.findMany({
          where: {
            missionId: input.missionId,
            assigneeId: { in: agentIds },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            assigneeId: true,
            createdById: true,
            createdAt: true,
          },
        }),
        db.missionRun.findMany({
          where: {
            missionId: input.missionId,
            agentId: { in: agentIds },
          },
          orderBy: { createdAt: "desc" },
          select: {
            agentId: true,
            status: true,
          },
        }),
      ]);

      const parentMap = new Map<string, string | null>();
      const taskIdMap = new Map<string, string | null>();
      const spawnTimeMap = new Map<string, number>();
      for (const task of tasks) {
        if (task.assigneeId && !parentMap.has(task.assigneeId)) {
          parentMap.set(
            task.assigneeId,
            task.createdById !== task.assigneeId ? task.createdById : null
          );
          taskIdMap.set(task.assigneeId, task.id);
          spawnTimeMap.set(task.assigneeId, task.createdAt.getTime());
        }
      }

      const statusMap = new Map<string, string>();
      for (const run of runs) {
        if (!statusMap.has(run.agentId)) {
          statusMap.set(run.agentId, run.status);
        }
      }

      const depthCache = new Map<string, number>();
      function resolveDepth(agentId: string): number {
        const cached = depthCache.get(agentId);
        if (cached !== undefined) {
          return cached;
        }
        const parent = parentMap.get(agentId);
        if (!(parent && agentIds.includes(parent))) {
          depthCache.set(agentId, 1);
          return 1;
        }
        const depth = resolveDepth(parent) + 1;
        depthCache.set(agentId, depth);
        return depth;
      }

      const entries = spawnedAgents.map((agent) => {
        const runStatus = statusMap.get(agent.id);
        let entryStatus: "pending" | "running" | "completed" | "failed" =
          "pending";
        if (runStatus === "RUNNING") {
          entryStatus = "running";
        } else if (runStatus === "COMPLETED") {
          entryStatus = "completed";
        } else if (runStatus === "FAILED" || runStatus === "TIMED_OUT") {
          entryStatus = "failed";
        }

        return SpawnRegistryEntrySchema.parse({
          agentId: agent.id,
          agentName: agent.name,
          parentAgentId: parentMap.get(agent.id) ?? null,
          spawnDepth: resolveDepth(agent.id),
          capabilities: agent.capabilities,
          status: entryStatus,
          spawnedAt: spawnTimeMap.get(agent.id) ?? Date.now(),
          taskId: taskIdMap.get(agent.id) ?? null,
        });
      });

      entries.sort((a, b) => a.spawnDepth - b.spawnDepth);

      return { entries };
    },

    async validateSpawnRequest(
      input: ValidateSpawnRequestInput
    ): Promise<SpawnValidationResult> {
      const request = SpawnAgentRequestSchema.parse(input.request);
      const limits = SpawnLimitsSchema.parse(input.spawnLimits);
      const normalizedRequiredCapabilities = request.requiredCapabilities.map(
        (capability) => normalizeCapability(capability)
      );

      if (input.currentSpawnedAgentCount >= limits.maxSpawnedAgentsPerMission) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Mission spawn limit reached (${limits.maxSpawnedAgentsPerMission})`,
        });
      }

      const requester = await db.missionAgent.findFirst({
        where: {
          missionId: input.missionId,
          id: request.requestingAgentId,
        },
        select: {
          id: true,
          level: true,
        },
      });

      if (!requester) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: "Requesting agent not found in mission roster",
        });
      }

      const requesterDepth = await resolveSpawnDepth(
        db,
        input.missionId,
        requester.id
      );

      const childDepth = requesterDepth + 1;
      const HARD_DEPTH_CEILING = 2;

      if (childDepth > limits.maxSpawnDepth + HARD_DEPTH_CEILING) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Hard spawn depth ceiling reached (max: ${limits.maxSpawnDepth + HARD_DEPTH_CEILING})`,
        });
      }

      if (
        limits.requireApprovalAboveDepth !== undefined &&
        childDepth > limits.requireApprovalAboveDepth
      ) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Depth ${childDepth} exceeds approval threshold (${limits.requireApprovalAboveDepth})`,
        });
      }

      if (childDepth > limits.maxSpawnDepth && !request.justification) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Spawn depth ${childDepth} exceeds limit (${limits.maxSpawnDepth}); provide justification for deeper spawning`,
        });
      }

      const existingSpecialist = await db.missionAgent.findFirst({
        where: {
          missionId: input.missionId,
          capabilities: { hasEvery: normalizedRequiredCapabilities },
        },
        select: { id: true, name: true },
      });

      if (existingSpecialist) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Capability coverage already available in roster (${existingSpecialist.name})`,
        });
      }

      const spawnActivities = await db.missionActivity.findMany({
        where: { missionId: input.missionId, type: "agent_spawned" },
        select: { metadata: true },
      });

      const spawnedByRequester = spawnActivities.filter((row) => {
        const metadata = toRecord(row.metadata);
        return metadata.parentAgentId === request.requestingAgentId;
      }).length;

      if (spawnedByRequester >= limits.maxSpawnedAgentsPerAgent) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Requester spawn limit reached (${limits.maxSpawnedAgentsPerAgent})`,
        });
      }

      const runningSpawnedCount = await db.missionRun.count({
        where: {
          missionId: input.missionId,
          status: "RUNNING",
          agent: { level: "spawned" },
        },
      });

      if (runningSpawnedCount >= limits.maxConcurrentSpawned) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: `Concurrent spawned limit reached (${limits.maxConcurrentSpawned})`,
        });
      }

      const budgetRemaining =
        input.budgetCents !== undefined
          ? Math.max(0, input.budgetCents - input.consumedCents)
          : undefined;

      if (budgetRemaining !== undefined && budgetRemaining <= 0) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: "No mission budget remaining",
        });
      }

      const budgetCapFromPercentage =
        budgetRemaining !== undefined
          ? Math.floor((budgetRemaining * limits.spawnBudgetPercentage) / 100)
          : request.budgetCentsLimit;

      if (budgetCapFromPercentage < 1) {
        return SpawnValidationResultSchema.parse({
          approved: false,
          reason: "Spawn budget allocation is below minimum threshold",
        });
      }

      const adjustedBudgetCents = Math.min(
        request.budgetCentsLimit,
        budgetCapFromPercentage
      );

      const unknownCapabilities = request.requiredCapabilities.filter(
        (capability) =>
          CAPABILITY_TOOL_MAP[normalizeCapability(capability)] === undefined
      );

      return SpawnValidationResultSchema.parse({
        approved: true,
        reason: "Spawn request approved",
        adjustedBudgetCents,
        adjustedMaxSteps: request.maxSteps,
        deniedCapabilities:
          unknownCapabilities.length > 0 ? unknownCapabilities : undefined,
      });
    },

    async generateSpawnedSoulPrompt(
      input: GenerateSpawnedSoulPromptInput
    ): Promise<GenerateSpawnedSoulPromptOutput> {
      const request = SpawnAgentRequestSchema.parse(input.request);
      const normalizedCapabilities = uniqueStrings(
        request.requiredCapabilities.map((capability) =>
          normalizeCapability(capability)
        )
      );
      const primaryCapability = normalizedCapabilities[0] ?? "general";
      const displayPrimary = toDisplayCapability(primaryCapability);
      const name = `${displayPrimary} Specialist`;
      const role = `Specialist for ${normalizedCapabilities
        .map(toDisplayCapability)
        .join(", ")}`;
      const tools = buildToolSet(
        normalizedCapabilities,
        request.suggestedTools
      );
      const soulPrompt = buildSpawnedPrompt(name, role, {
        ...request,
        requiredCapabilities: normalizedCapabilities,
      });

      const blueprint = SpawnedAgentBlueprintSchema.parse({
        name,
        role,
        soulPrompt,
        tools,
        capabilities: normalizedCapabilities,
        maxSteps: request.maxSteps,
        budgetCentsLimit: request.budgetCentsLimit,
        parentAgentId: request.requestingAgentId,
        spawnReason: request.taskDescription,
        sandboxConfig: request.sandboxConfig,
      });

      return await Promise.resolve({ blueprint });
    },

    async createSpawnedAgent(
      input: CreateSpawnedAgentInput
    ): Promise<CreateSpawnedAgentOutput> {
      const request = SpawnAgentRequestSchema.parse(input.request);
      const blueprint = SpawnedAgentBlueprintSchema.parse(input.blueprint);

      const existingTask = await db.missionTask.findUnique({
        where: { requestId: input.requestId },
        select: { id: true, assigneeId: true },
      });

      if (existingTask) {
        return {
          missionAgentId: existingTask.assigneeId ?? existingTask.id,
          taskId: existingTask.id,
        };
      }

      const mission = await db.mission.findUnique({
        where: { id: input.missionId },
        select: {
          id: true,
          teamId: true,
          createdById: true,
        },
      });

      if (!mission) {
        throw new Error(`Mission ${input.missionId} not found`);
      }

      const sortOrderAgg = await db.missionAgent.aggregate({
        where: { missionId: input.missionId },
        _max: { sortOrder: true },
      });
      const nextSortOrder = (sortOrderAgg._max.sortOrder ?? 0) + 1;

      const backgroundAgent = await db.backgroundAgent.create({
        data: {
          teamId: mission.teamId,
          userId: mission.createdById,
          name: blueprint.name,
          description: blueprint.role,
          prompt: blueprint.soulPrompt,
          preset: "general",
        },
        select: { id: true },
      });

      const missionAgent = await db.missionAgent.create({
        data: {
          missionId: input.missionId,
          agentId: backgroundAgent.id,
          name: blueprint.name,
          role: blueprint.role,
          soulPrompt: blueprint.soulPrompt,
          level: "spawned",
          sortOrder: nextSortOrder,
          tools: blueprint.tools,
          capabilities: blueprint.capabilities,
        },
        select: { id: true },
      });

      if (blueprint.sandboxConfig) {
        await db.missionMemory.upsert({
          where: {
            missionId_agentId_key_scope: {
              missionId: input.missionId,
              agentId: missionAgent.id,
              key: "sandbox_config",
              scope: "agent",
            },
          },
          create: {
            missionId: input.missionId,
            agentId: missionAgent.id,
            key: "sandbox_config",
            scope: "agent",
            value: blueprint.sandboxConfig as never,
          },
          update: {
            value: blueprint.sandboxConfig as never,
          },
        });
      }

      const taskDescription = request.context
        ? `${request.taskDescription}\n\nContext:\n${request.context}`
        : request.taskDescription;

      const task = await db.missionTask.create({
        data: {
          missionId: input.missionId,
          title: blueprint.spawnReason.slice(0, 180),
          description: taskDescription,
          status: "ASSIGNED",
          priority: request.priority,
          assigneeId: missionAgent.id,
          requestId: input.requestId,
          createdById: request.requestingAgentId,
          dependsOn: request.dependsOnTaskId ? [request.dependsOnTaskId] : [],
          requiredCapabilities: blueprint.capabilities,
        },
        select: { id: true },
      });

      return {
        missionAgentId: missionAgent.id,
        taskId: task.id,
      };
    },

    async routeAgentMessage(input) {
      const result = await routeAgentMessage(input);

      await publishTimelineEvent({
        missionId: input.missionId,
        eventType: "agent_message_sent",
        payload: {
          messageId: result.messageId,
          fromAgentId: input.senderId,
          fromAgentName: input.senderName ?? input.senderId,
          toAgentId: input.recipientId,
          channel: input.kind === "broadcast" ? "broadcast" : "direct",
          preview: input.subject,
          content:
            typeof input.body === "string"
              ? input.body
              : JSON.stringify(input.body),
          replyToMessageId: input.replyToMessageId,
        },
      });

      return result;
    },
    async selectReviewer(
      input: SelectReviewerInput
    ): Promise<SelectReviewerOutput> {
      const agents = await db.missionAgent.findMany({
        where: {
          missionId: input.missionId,
          id: { not: input.authorAgentId },
        },
        select: {
          id: true,
          name: true,
          capabilities: true,
        },
      });

      const scored = agents
        .map((agent) => {
          const capabilities = (agent.capabilities as string[]) ?? [];
          const overlap = input.requiredCapabilities.filter((c) =>
            capabilities.includes(c)
          ).length;
          const matchScore =
            input.requiredCapabilities.length > 0
              ? overlap / input.requiredCapabilities.length
              : 0.5;
          return { agent, matchScore };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      const best = scored[0];
      if (!best) {
        throw new Error("No available reviewer agents");
      }

      return {
        reviewerAgentId: best.agent.id,
        reviewerAgentName: best.agent.name,
        matchScore: best.matchScore,
      };
    },

    async checkReviewGating(
      input: CheckReviewGatingInput
    ): Promise<CheckReviewGatingOutput> {
      const { policy, requiredReviewers, highStakesPriorities } =
        input.reviewGating;

      if (policy === "none") {
        return {
          gated: false,
          reason: "No review policy configured",
          requiredReviewers: 0,
          completedReviews: 0,
        };
      }

      if (
        policy === "peer_high_stakes" &&
        !highStakesPriorities.includes(input.taskPriority as "P0" | "P1")
      ) {
        return {
          gated: false,
          reason: `Task priority ${input.taskPriority} does not require review`,
          requiredReviewers: 0,
          completedReviews: 0,
        };
      }

      const memory = await db.missionMemory.findUnique({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: "system",
            key: `peer_reviews:${input.taskId}`,
            scope: "mission",
          },
        },
      });

      const rawValue = memory?.value;
      const reviews = Array.isArray(rawValue) ? rawValue : [];
      const approvedReviews = reviews.filter(
        (r) =>
          r !== null &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          (r as Record<string, unknown>).verdict === "approve"
      );

      const needed = policy === "consensus" ? requiredReviewers : 1;

      if (approvedReviews.length >= needed) {
        return {
          gated: false,
          reason: `Review requirement met (${approvedReviews.length}/${needed} approvals)`,
          requiredReviewers: needed,
          completedReviews: approvedReviews.length,
        };
      }

      return {
        gated: true,
        reason: `Awaiting ${needed - approvedReviews.length} more approval(s)`,
        requiredReviewers: needed,
        completedReviews: approvedReviews.length,
      };
    },

    fetchAgentInbox,
    waitForAgentReply,
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

export {
  createDefaultReflectionTextGenerator,
  createReflectionActivities,
} from "./reflection";
export type {
  CheckMissionHealthInput,
  CriticReviewInput,
  EscalateInput,
  EvaluateProgressInput,
  GenerateReplanInput,
  NotifyDependencyFailureInput,
  NotifyDependencyFailureOutput,
  ReflectionActivities,
} from "./reflection-types";
export type { MissionActivities } from "./types";
