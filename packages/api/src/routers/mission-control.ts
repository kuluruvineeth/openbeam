import {
  claimMissionTask,
  completeMissionTaskByMission,
  createMission,
  createMissionAgent,
  createMissionTask,
  deleteMission,
  findMissionAgent,
  findMissionTask,
  getMission,
  getMissionActivity,
  getMissionMemory,
  getMissionRun,
  getMissionStats,
  listMissionApprovals,
  listMissionMemory,
  listMissionRunArtifacts,
  listMissionRuns,
  listMissionsWithStats,
  logMissionActivity,
  removeMissionAgent,
  updateMission,
  updateMissionAgent,
  updateMissionTask,
  upsertMissionMemory,
} from "@openplane/db";
import {
  createMissionEventSubscriber,
  publishMissionTimelineEvent,
} from "@openplane/redis";
import { logger } from "@openplane/services/lib/logger";
import {
  cancelMission,
  cancelSignal,
  extendTimeoutSignal,
  getAgentReflection,
  getMissionHealth,
  getTemporalClient,
  pauseMission,
  resumeMission,
  startMission,
  wakeMission,
} from "@openplane/temporal";
import type { MissionEventPayload } from "@openplane/types/mission-control";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";
import {
  selectActiveMissionRunIdForAgent,
  shouldEmitEvent,
} from "./mission-control.utils";

const MissionStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

const missionIdSchema = z.object({
  missionId: z.string(),
});

const listMissionsSchema = z.object({
  status: MissionStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createMissionSchema = z.object({
  objective: z.string().min(1).max(5000),
  budgetCents: z.number().int().positive().optional(),
  maxConcurrentRuns: z.number().int().min(1).max(10).default(3),
  heartbeatIntervalMin: z.number().int().min(1).max(1440).optional(),
  cronSchedule: z.string().min(9).max(100).optional(),
});

const listActivitySchema = z.object({
  missionId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const listApprovalsSchema = z.object({
  missionId: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ESCALATED"]).optional(),
});

const SpawnAgentInputSchema = z.object({
  missionId: z.string(),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  tools: z.array(z.string()).default([]),
  taskId: z.string().optional(),
});

const ExtendAgentTimeoutInputSchema = z.object({
  missionId: z.string(),
  agentId: z.string(),
  requestedTier: z.enum(["quick", "standard", "extended", "marathon"]),
});

const BulkExtendTimeoutsInputSchema = z.object({
  missionId: z.string(),
});

const BroadcastMessageInputSchema = z.object({
  missionId: z.string(),
  content: z.string().min(1).max(10_000),
});

const ForceReplanInputSchema = z.object({
  missionId: z.string(),
  agentId: z.string(),
});

const CancelAgentInputSchema = z.object({
  missionId: z.string(),
  agentId: z.string(),
});

const ListMessagesInputSchema = z.object({
  missionId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

const GetHealthSnapshotInputSchema = z.object({
  missionId: z.string(),
});

const GetReflectionHistoryInputSchema = z.object({
  missionId: z.string(),
  agentId: z.string(),
  limit: z.number().min(1).max(100).default(20),
});

const ROLE_CAPABILITIES: Record<string, string[]> = {
  coordinator: ["coordination", "synthesis", "review"],
  researcher: ["research", "analysis"],
  analyst: ["analysis", "data"],
  writer: ["writing", "synthesis"],
  reviewer: ["review", "analysis"],
  specialist: ["research"],
};

function deriveCapabilities(role: string): string[] {
  return ROLE_CAPABILITIES[role] ?? ["research"];
}

const MUTABLE_STATUSES = ["DRAFT", "PAUSED"] as const;
const DELETABLE_STATUSES = [
  "DRAFT",
  "CANCELLED",
  "COMPLETED",
  "ARCHIVED",
] as const;
const ARCHIVABLE_STATUSES = ["COMPLETED", "CANCELLED"] as const;
const TERMINAL_MISSION_EVENTS = [
  "mission.completed",
  "mission.failed",
  "mission.cancelled",
];

const EVENT_TYPE_ALIASES: Record<string, string> = {
  approval_requested: "approval.requested",
  approval_resolved: "approval.resolved",
  artifact_published: "artifact.published",
};

function normalizeMissionEventType(eventType: string): string {
  return EVENT_TYPE_ALIASES[eventType] ?? eventType;
}

async function publishMissionTimelineEventSafe(input: {
  missionId: string;
  runId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}): Promise<void> {
  if (!input.runId) {
    return;
  }

  try {
    await publishMissionTimelineEvent({
      missionId: input.missionId,
      runId: input.runId,
      lane: "autonomous",
      eventType: normalizeMissionEventType(input.eventType),
      timestamp: input.timestamp ?? Date.now(),
      payload: input.payload,
    });
  } catch (error) {
    logger.warn(
      {
        missionId: input.missionId,
        eventType: input.eventType,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to publish mission timeline event"
    );
  }
}

const MissionAgentLevelSchema = z.enum(["lead", "specialist", "reviewer"]);
const MissionTaskPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);

async function verifyMissionAccess(
  prisma: Parameters<typeof getMission>[0],
  missionId: string,
  teamId: string
) {
  const mission = await getMission(prisma, missionId, teamId);

  if (!mission) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Mission not found",
    });
  }

  return mission;
}

function assertMutableStatus(status: string) {
  if (!MUTABLE_STATUSES.includes(status as (typeof MUTABLE_STATUSES)[number])) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot modify mission in ${status} status`,
    });
  }
}

function assertMissionStatus(status: string, allowed: readonly string[]): void {
  if (!allowed.includes(status)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot perform this action in ${status} status`,
    });
  }
}

function resolveMissionRunWorkflowId(
  missionId: string,
  runId: string,
  workflowId: string | null
): string {
  if (workflowId && workflowId.length > 0) {
    return workflowId;
  }
  return `mission-run:${missionId}:${runId}`;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }
  return value;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return;
  }
  return value;
}

export const missionControlRouter = createTRPCRouter({
  getBoard: withActiveTeam
    .input(listMissionsSchema)
    .query(async ({ ctx, input }) => {
      const missions = await listMissionsWithStats(ctx.prisma, ctx.teamId, {
        status: input.status,
        limit: input.limit + 1,
        offset: input.offset,
      });

      const hasMore = missions.length > input.limit;
      const items = hasMore ? missions.slice(0, -1) : missions;

      return {
        items: items.map((m) => ({
          id: m.id,
          name: m.name,
          objective: m.objective,
          status: m.status,
          agentCount: m._count.agents,
          taskCount: m.tasks.length,
          completedTasks: m.tasks.filter((t) => t.status === "DONE").length,
          totalCostCents: m.runs.reduce((sum, r) => sum + r.costCents, 0),
          budgetCents: m.budgetCents,
          consumedCents: m.consumedCents,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        })),
        hasMore,
        nextOffset: hasMore ? input.offset + items.length : undefined,
      };
    }),

  get: withActiveTeam
    .input(missionIdSchema)
    .query(async ({ ctx, input }) =>
      verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId)
    ),

  getStats: withActiveTeam
    .input(missionIdSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);
      return getMissionStats(ctx.prisma, input.missionId);
    }),

  listActivity: withActiveTeam
    .input(listActivitySchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const items = await getMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        limit: input.limit + 1,
        cursor: input.cursor,
      });

      const hasMore = items.length > input.limit;
      const results = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore ? results.at(-1)?.id : undefined;

      return { items: results, hasMore, nextCursor };
    }),

  listApprovals: withActiveTeam
    .input(listApprovalsSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);
      return listMissionApprovals(ctx.prisma, input.missionId, {
        status: input.status,
      });
    }),

  listMessages: withActiveTeam
    .input(ListMessagesInputSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const items = await getMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        limit: input.limit + 25,
        cursor: input.cursor,
      });

      const messageItems = items.filter((item) =>
        [
          "agent_message_sent",
          "agent_message_received",
          "agent.message_sent",
          "agent.message_received",
        ].includes(item.type)
      );

      const trimmed = messageItems.slice(0, input.limit);
      const nextCursor =
        messageItems.length > input.limit ? trimmed.at(-1)?.id : undefined;

      return {
        messages: trimmed.map((item) => {
          const metadata = (item.metadata as Record<string, unknown>) ?? {};
          const channel = toOptionalString(metadata.channel);
          return {
            messageId: toOptionalString(metadata.messageId) ?? item.id,
            missionId: input.missionId,
            fromAgentId: toOptionalString(metadata.fromAgentId) ?? "",
            fromAgentName:
              toOptionalString(metadata.fromAgentName) ??
              toOptionalString(metadata.agentName) ??
              "Agent",
            toAgentId: toOptionalString(metadata.toAgentId) ?? null,
            toAgentName: toOptionalString(metadata.toAgentName) ?? null,
            channel:
              channel === "broadcast" || channel === "cross_mission"
                ? channel
                : "direct",
            contentPreview:
              toOptionalString(metadata.preview) ??
              toOptionalString(metadata.content) ??
              item.message,
            fullContent: toOptionalString(metadata.content),
            replyToMessageId:
              toOptionalString(metadata.replyToMessageId) ?? null,
            sourceMissionId: toOptionalString(metadata.sourceMissionId),
            sourceMissionName: toOptionalString(metadata.sourceMissionName),
            timestamp: new Date(item.createdAt).getTime(),
          };
        }),
        nextCursor,
      };
    }),

  getHealthSnapshot: withActiveTeam
    .input(GetHealthSnapshotInputSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const snapshot = await getMissionHealth(input.missionId);
      if (!snapshot) {
        return null;
      }

      const progressingCount = snapshot.agents.filter(
        (agent) => agent.status === "progressing"
      ).length;
      const stuckCount = snapshot.agents.filter(
        (agent) => agent.status === "stuck"
      ).length;
      const escalatedCount = snapshot.agents.filter(
        (agent) => agent.status === "escalated"
      ).length;

      return {
        missionId: snapshot.missionId,
        totalAgents: snapshot.agents.length,
        progressingCount,
        stuckCount,
        escalatedCount,
        agents: snapshot.agents.map((agent) => ({
          agentId: agent.agentId,
          agentName: agent.agentId,
          progressScore: agent.lastProgressScore,
          replanCount: agent.replanCount,
          healthStatus: agent.status,
          recentScores: [agent.lastProgressScore],
          stuckReason:
            agent.status === "stuck" || agent.status === "escalated"
              ? "No recent progress"
              : null,
          escalationReason:
            agent.status === "escalated"
              ? "Escalated by mission health monitor"
              : null,
        })),
        failurePatterns: snapshot.failedDependencies.map((dependency) => ({
          pattern: `Task ${dependency.failedTaskId} blocked dependencies`,
          frequency: dependency.blockedTaskIds.length,
          affectedAgents: dependency.blockedTaskIds,
        })),
        computedAt: snapshot.timestamp,
      };
    }),

  getReflectionHistory: withActiveTeam
    .input(GetReflectionHistoryInputSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const items = await getMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        limit: Math.min(input.limit * 5, 200),
      });

      const filtered = items
        .filter((item) => {
          const metadata = (item.metadata as Record<string, unknown>) ?? {};
          const metadataAgentId = toOptionalString(metadata.agentId);
          return (
            ["agent_self_evaluated", "agent_replanned"].includes(item.type) &&
            (metadataAgentId === input.agentId ||
              item.agentId === input.agentId)
          );
        })
        .slice(0, input.limit);

      const entries = filtered.map((item) => {
        const metadata = (item.metadata as Record<string, unknown>) ?? {};
        return {
          entryId: item.id,
          agentId: toOptionalString(metadata.agentId) ?? input.agentId,
          agentName: toOptionalString(metadata.agentName) ?? "Agent",
          stepNumber:
            toOptionalNumber(metadata.stepNumber) ??
            toOptionalNumber(metadata.step) ??
            0,
          score:
            toOptionalNumber(metadata.score) ??
            toOptionalNumber(metadata.progressScore) ??
            0,
          verbalMemory:
            toOptionalString(metadata.verbalMemory) ??
            toOptionalString(metadata.reasoning) ??
            item.message,
          timestamp: new Date(item.createdAt).getTime(),
          triggeredReplan:
            item.type === "agent_replanned" ||
            Boolean(metadata.triggeredReplan),
        };
      });

      const runningRuns = await listMissionRuns(ctx.prisma, input.missionId, {
        status: "RUNNING",
        limit: 200,
        offset: 0,
      });
      const activeRunId = selectActiveMissionRunIdForAgent(
        runningRuns,
        input.agentId
      );

      if (!activeRunId) {
        return entries;
      }

      const liveReflection = await getAgentReflection({
        missionId: input.missionId,
        runId: activeRunId,
      });
      if (!liveReflection) {
        return entries;
      }

      const liveEntries = liveReflection.reflectionBuffer.map(
        (entry, index) => ({
          entryId: `live-${entry.step}-${index}`,
          agentId: input.agentId,
          agentName: "Agent",
          stepNumber: entry.step,
          score: entry.evaluation.progressScore,
          verbalMemory: entry.evaluation.reasoning,
          timestamp: entry.timestamp,
          triggeredReplan: false,
        })
      );

      return [...liveEntries, ...entries].slice(0, input.limit);
    }),

  listRuns: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        status: z
          .enum([
            "QUEUED",
            "RUNNING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            "TIMED_OUT",
          ])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const items = await listMissionRuns(ctx.prisma, input.missionId, {
        status: input.status,
        limit: input.limit + 1,
        offset: input.offset,
      });

      const hasMore = items.length > input.limit;
      const runs = hasMore ? items.slice(0, -1) : items;

      return {
        items: runs,
        hasMore,
        nextOffset: hasMore ? input.offset + runs.length : undefined,
      };
    }),

  listArtifacts: withActiveTeam
    .input(missionIdSchema)
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const runs = await listMissionRunArtifacts(ctx.prisma, input.missionId);

      const artifactsSchema = z.array(z.unknown());

      return runs.map((r) => ({
        runId: r.id,
        agentName: r.agent.name,
        artifacts: artifactsSchema.parse(r.artifacts ?? []),
        createdAt: r.createdAt,
      }));
    }),

  create: withActiveTeam
    .input(createMissionSchema)
    .mutation(async ({ ctx, input }) =>
      createMission(ctx.prisma, {
        teamId: ctx.teamId,
        createdById: ctx.session.user.id,
        name: input.objective.slice(0, 100),
        objective: input.objective,
        budgetCents: input.budgetCents,
        maxConcurrentRuns: input.maxConcurrentRuns,
        heartbeatIntervalMin: input.heartbeatIntervalMin,
        cronSchedule: input.cronSchedule,
        isRecurring: !!input.cronSchedule,
      })
    ),

  start: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (mission.status !== "DRAFT" && mission.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start mission in ${mission.status} status`,
        });
      }

      const handle = await startMission({
        missionId: input.missionId,
        teamId: ctx.teamId,
        objective: mission.objective,
        maxConcurrentRuns: mission.maxConcurrentRuns,
        budgetCents: mission.budgetCents ?? undefined,
        heartbeatIntervalMin: mission.heartbeatIntervalMin,
      });

      await updateMission(ctx.prisma, input.missionId, {
        status: "ACTIVE",
        workflowId: handle.workflowId,
        runId: handle.runId || mission.runId || undefined,
      });

      return { missionId: input.missionId, workflowId: handle.workflowId };
    }),

  pause: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (mission.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only pause active missions",
        });
      }

      await pauseMission(input.missionId, ctx.session.user.id);
      await updateMission(ctx.prisma, input.missionId, { status: "PAUSED" });

      return { success: true };
    }),

  resume: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (mission.status !== "PAUSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resume paused missions",
        });
      }

      await resumeMission(input.missionId, ctx.session.user.id);
      await updateMission(ctx.prisma, input.missionId, { status: "ACTIVE" });

      return { success: true };
    }),

  cancel: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      const cancellableStatuses = ["DRAFT", "ACTIVE", "PAUSED"];

      if (!cancellableStatuses.includes(mission.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel mission in ${mission.status} status`,
        });
      }

      if (mission.workflowId) {
        await cancelMission(input.missionId, ctx.session.user.id);
      }

      await updateMission(ctx.prisma, input.missionId, {
        status: "CANCELLED",
      });

      return { success: true };
    }),

  spawnAgent: withActiveTeam
    .input(SpawnAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const agent = await createMissionAgent(ctx.prisma, {
        missionId: input.missionId,
        name: input.name,
        role: input.role,
        soulPrompt: `You are ${input.name}, a ${input.role}.`,
        level: "specialist",
        tools: input.tools,
        capabilities: deriveCapabilities(input.role),
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });

      let taskId = input.taskId;
      if (taskId) {
        const task = await findMissionTask(ctx.prisma, taskId, input.missionId);
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Task not found in this mission",
          });
        }

        await updateMissionTask(ctx.prisma, taskId, {
          assigneeId: agent.id,
          status: "ASSIGNED",
        });
      } else {
        const task = await createMissionTask(ctx.prisma, {
          missionId: input.missionId,
          title: `Delegated to ${input.name}`,
          description: `Operator-spawned task for ${input.role}`,
          priority: "P2",
          assigneeId: agent.id,
          dependsOn: [],
          requiredCapabilities: deriveCapabilities(input.role),
          requestId: crypto.randomUUID(),
          createdById: ctx.session.user.id,
        });
        taskId = task.id;
      }

      const payload = {
        childAgentId: agent.id,
        childAgentName: input.name,
        parentAgentId: ctx.session.user.id,
        parentAgentName: "Operator",
        spawnDepth: 0,
        role: input.role,
        taskId,
      };

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        agentId: agent.id,
        type: "agent_spawned",
        message: `Operator spawned agent "${input.name}"`,
        metadata: payload,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "agent_spawned",
        payload,
      });

      if (mission.workflowId) {
        await wakeMission(input.missionId, {
          missionId: input.missionId,
          reason: "manual",
          metadata: {
            action: "spawn_agent",
            agentId: agent.id,
            taskId,
            requestedBy: ctx.session.user.id,
          },
        });
      }

      return { success: true, agentId: agent.id, taskId };
    }),

  extendAgentTimeout: withActiveTeam
    .input(ExtendAgentTimeoutInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const agent = await findMissionAgent(
        ctx.prisma,
        input.agentId,
        input.missionId
      );
      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found in this mission",
        });
      }

      const runningRuns = await listMissionRuns(ctx.prisma, input.missionId, {
        status: "RUNNING",
        limit: 200,
        offset: 0,
      });
      const run = runningRuns.find((item) => item.agentId === input.agentId);
      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active run found for this agent",
        });
      }

      const client = await getTemporalClient();
      const handle = client.workflow.getHandle(
        resolveMissionRunWorkflowId(input.missionId, run.id, run.workflowId)
      );
      await handle.signal(extendTimeoutSignal, {
        requestedTier: input.requestedTier,
        reason: "operator_request",
        requestedBy: ctx.session.user.id,
      });

      const payload = {
        agentId: input.agentId,
        tier: input.requestedTier,
        requestedBy: ctx.session.user.id,
      };

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        agentId: input.agentId,
        type: "agent_timeout_extended",
        message: `Timeout extended to ${input.requestedTier}`,
        metadata: payload,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "agent_timeout_extended",
        payload,
      });

      return { success: true };
    }),

  bulkExtendTimeouts: withActiveTeam
    .input(BulkExtendTimeoutsInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const runningRuns = await listMissionRuns(ctx.prisma, input.missionId, {
        status: "RUNNING",
        limit: 500,
        offset: 0,
      });

      const client = await getTemporalClient();
      let signaled = 0;

      for (const run of runningRuns) {
        try {
          const handle = client.workflow.getHandle(
            resolveMissionRunWorkflowId(input.missionId, run.id, run.workflowId)
          );
          await handle.signal(extendTimeoutSignal, {
            requestedTier: "extended",
            reason: "operator_bulk_request",
            requestedBy: ctx.session.user.id,
          });
          signaled += 1;

          await publishMissionTimelineEventSafe({
            missionId: input.missionId,
            runId: mission.runId,
            eventType: "agent_timeout_extended",
            payload: {
              agentId: run.agentId,
              tier: "extended",
              requestedBy: ctx.session.user.id,
            },
          });
        } catch (error) {
          logger.warn(
            {
              missionId: input.missionId,
              runId: run.id,
              agentId: run.agentId,
              error: error instanceof Error ? error.message : String(error),
            },
            "Failed to bulk-extend timeout for run"
          );
        }
      }

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        type: "agent_timeout_extended",
        message: `Bulk timeout extension requested for ${signaled} active agent(s)`,
        metadata: {
          signaled,
          requestedBy: ctx.session.user.id,
        },
      });

      return { success: true, signaled };
    }),

  broadcastMessage: withActiveTeam
    .input(BroadcastMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const preview =
        input.content.length > 180
          ? `${input.content.slice(0, 180)}...`
          : input.content;
      const payload = {
        messageId: crypto.randomUUID(),
        fromAgentId: ctx.session.user.id,
        fromAgentName: "Operator",
        toAgentId: null,
        toAgentName: "All agents",
        channel: "broadcast",
        preview,
        content: input.content,
      };

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        type: "agent_message_sent",
        message: `Broadcast sent: ${preview}`,
        metadata: payload,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "agent_message_sent",
        payload,
      });

      await wakeMission(input.missionId, {
        missionId: input.missionId,
        reason: "mention",
        metadata: {
          action: "broadcast_message",
          messageId: payload.messageId,
          requestedBy: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  forceReplan: withActiveTeam
    .input(ForceReplanInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const agent = await findMissionAgent(
        ctx.prisma,
        input.agentId,
        input.missionId
      );
      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found in this mission",
        });
      }

      const payload = {
        agentId: input.agentId,
        reason: "Operator requested replan",
        requestedBy: ctx.session.user.id,
      };

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        agentId: input.agentId,
        type: "agent_replanned",
        message: "Operator requested replan",
        metadata: payload,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "agent_replanned",
        payload,
      });

      await wakeMission(input.missionId, {
        missionId: input.missionId,
        reason: "manual",
        metadata: {
          action: "force_replan",
          agentId: input.agentId,
          requestedBy: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  cancelAgent: withActiveTeam
    .input(CancelAgentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      assertMissionStatus(mission.status, ["ACTIVE"]);

      const agent = await findMissionAgent(
        ctx.prisma,
        input.agentId,
        input.missionId
      );
      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found in this mission",
        });
      }

      const runningRuns = await listMissionRuns(ctx.prisma, input.missionId, {
        status: "RUNNING",
        limit: 200,
        offset: 0,
      });
      const run = runningRuns.find((item) => item.agentId === input.agentId);

      if (run) {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(
          resolveMissionRunWorkflowId(input.missionId, run.id, run.workflowId)
        );
        await handle.signal(cancelSignal);
      }

      const payload = {
        agentId: input.agentId,
        errorMessage: "Cancelled by operator",
        requestedBy: ctx.session.user.id,
      };

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        agentId: input.agentId,
        type: "agent_cancelled",
        message: "Agent cancelled by operator",
        metadata: payload,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "run.failed",
        payload,
      });

      return { success: true, cancelled: Boolean(run) };
    }),

  approveAction: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        approvalId: z.string(),
        reason: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      const metadata = {
        approvalId: input.approvalId,
        approved: true,
        resolvedById: ctx.session.user.id,
        reason: input.reason,
      };
      const message = `Approved${input.reason ? `: ${input.reason}` : ""}`;

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        type: "approval_resolved",
        message,
        metadata,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "approval_resolved",
        payload: metadata,
      });

      return { approved: true };
    }),

  rejectAction: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        approvalId: z.string(),
        reason: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      const metadata = {
        approvalId: input.approvalId,
        approved: false,
        resolvedById: ctx.session.user.id,
        reason: input.reason,
      };
      const message = `Rejected: ${input.reason}`;

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        type: "approval_resolved",
        message,
        metadata,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "approval_resolved",
        payload: metadata,
      });

      return { approved: false };
    }),

  update: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        name: z.string().min(1).max(100).optional(),
        objective: z.string().min(1).max(5000).optional(),
        budgetCents: z.number().int().positive().optional(),
        maxConcurrentRuns: z.number().int().min(1).max(10).optional(),
        heartbeatIntervalMin: z.number().int().min(1).max(1440).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      assertMutableStatus(mission.status);

      return updateMission(ctx.prisma, input.missionId, {
        name: input.name,
        objective: input.objective,
        budgetCents: input.budgetCents,
        maxConcurrentRuns: input.maxConcurrentRuns,
        heartbeatIntervalMin: input.heartbeatIntervalMin,
      });
    }),

  delete: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (
        !DELETABLE_STATUSES.includes(
          mission.status as (typeof DELETABLE_STATUSES)[number]
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete mission in ${mission.status} status`,
        });
      }

      await deleteMission(ctx.prisma, input.missionId);

      return { success: true };
    }),

  archive: withActiveTeam
    .input(missionIdSchema)
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (
        !ARCHIVABLE_STATUSES.includes(
          mission.status as (typeof ARCHIVABLE_STATUSES)[number]
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only archive completed or cancelled missions",
        });
      }

      await updateMission(ctx.prisma, input.missionId, {
        status: "ARCHIVED",
      });

      return { success: true };
    }),

  addAgent: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        name: z.string().min(1).max(100),
        role: z.string().min(1).max(200),
        soulPrompt: z.string().min(1).max(10_000),
        level: MissionAgentLevelSchema.default("specialist"),
        tools: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      assertMutableStatus(mission.status);

      return createMissionAgent(ctx.prisma, {
        missionId: input.missionId,
        name: input.name,
        role: input.role,
        soulPrompt: input.soulPrompt,
        level: input.level,
        tools: input.tools,
        capabilities: deriveCapabilities(input.role),
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });
    }),

  removeAgent: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      assertMutableStatus(mission.status);

      const result = await removeMissionAgent(
        ctx.prisma,
        input.agentId,
        input.missionId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found in this mission",
        });
      }

      return { success: true };
    }),

  updateAgent: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        agentId: z.string(),
        name: z.string().min(1).max(100).optional(),
        role: z.string().min(1).max(200).optional(),
        soulPrompt: z.string().min(1).max(10_000).optional(),
        level: MissionAgentLevelSchema.optional(),
        tools: z.array(z.string()).optional(),
        capabilities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const agent = await findMissionAgent(
        ctx.prisma,
        input.agentId,
        input.missionId
      );

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found in this mission",
        });
      }

      return updateMissionAgent(ctx.prisma, input.agentId, {
        name: input.name,
        role: input.role,
        soulPrompt: input.soulPrompt,
        level: input.level,
        tools: input.tools,
        capabilities: input.capabilities,
      });
    }),

  createTask: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        title: z.string().min(1).max(500),
        description: z.string().max(5000).optional(),
        priority: MissionTaskPrioritySchema.default("P2"),
        assigneeId: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        requiredCapabilities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      return createMissionTask(ctx.prisma, {
        missionId: input.missionId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        assigneeId: input.assigneeId,
        dependsOn: input.dependsOn,
        requiredCapabilities: input.requiredCapabilities,
        requestId: crypto.randomUUID(),
        createdById: ctx.session.user.id,
      });
    }),

  updateTask: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        taskId: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(5000).optional(),
        priority: MissionTaskPrioritySchema.optional(),
        status: z
          .enum([
            "INBOX",
            "ASSIGNED",
            "IN_PROGRESS",
            "REVIEW",
            "DONE",
            "BLOCKED",
            "CANCELLED",
          ])
          .optional(),
        assigneeId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const task = await findMissionTask(
        ctx.prisma,
        input.taskId,
        input.missionId
      );

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found in this mission",
        });
      }

      const now = new Date();
      const timestamps: Record<string, Date> = {};

      if (input.status && input.status !== task.status) {
        if (input.status === "IN_PROGRESS" && !task.claimedAt) {
          timestamps.claimedAt = now;
        }
        if (input.status === "DONE" && !task.completedAt) {
          timestamps.completedAt = now;
        }
      }

      return updateMissionTask(ctx.prisma, input.taskId, {
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: input.status,
        assigneeId: input.assigneeId,
        ...timestamps,
      });
    }),

  claimTask: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        taskId: z.string(),
        agentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const result = await claimMissionTask(
        ctx.prisma,
        input.taskId,
        input.agentId,
        input.missionId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task cannot be claimed in its current status",
        });
      }

      return { success: true };
    }),

  completeTask: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        taskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const result = await completeMissionTaskByMission(
        ctx.prisma,
        input.taskId,
        input.missionId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Task cannot be completed in its current status",
        });
      }

      return { success: true };
    }),

  onMissionEvent: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        runId: z.string().optional(),
        agentName: z.string().optional(),
        since: z.number().optional(),
      })
    )
    .subscription(async function* ({
      ctx,
      input,
      signal,
    }): AsyncGenerator<MissionEventPayload> {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );
      const resolvedRunId = input.runId ?? mission.runId ?? "";
      const filter = {
        agentName: input.agentName,
        since: input.since,
      };

      const queue: MissionEventPayload[] = [];
      let resolve: (() => void) | null = null;

      const unsubscribe = await createMissionEventSubscriber(
        input.missionId,
        resolvedRunId,
        (event) => {
          if (shouldEmitEvent(event, filter)) {
            queue.push(event);
            resolve?.();
          }
        }
      );

      let cleanedUp = false;
      const cleanup = async () => {
        if (!cleanedUp) {
          cleanedUp = true;
          await unsubscribe();
        }
      };

      try {
        signal?.addEventListener("abort", cleanup, { once: true });

        yield {
          missionId: input.missionId,
          runId: resolvedRunId,
          lane: "autonomous" as const,
          sequence: -1,
          eventType: "connected",
          timestamp: Date.now(),
          payload: {},
        };

        while (!signal?.aborted) {
          if (queue.length === 0) {
            await new Promise<void>((r) => {
              resolve = r;
              signal?.addEventListener("abort", () => r(), { once: true });
            });
          }

          if (signal?.aborted) {
            break;
          }

          while (queue.length > 0) {
            const event = queue.shift();
            if (!event) {
              continue;
            }

            yield event;

            if (TERMINAL_MISSION_EVENTS.includes(event.eventType)) {
              return;
            }
          }
        }
      } finally {
        await cleanup();
      }
    }),

  resolveApproval: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        approvalId: z.string(),
        approved: z.boolean(),
        reason: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      const metadata = {
        approvalId: input.approvalId,
        approved: input.approved,
        resolvedById: ctx.session.user.id,
        reason: input.reason,
      };
      const message = input.approved
        ? `Approved${input.reason ? `: ${input.reason}` : ""}`
        : `Rejected${input.reason ? `: ${input.reason}` : ""}`;

      await logMissionActivity(ctx.prisma, {
        missionId: input.missionId,
        userId: ctx.session.user.id,
        type: "approval_resolved",
        message,
        metadata,
      });

      await publishMissionTimelineEventSafe({
        missionId: input.missionId,
        runId: mission.runId,
        eventType: "approval_resolved",
        payload: metadata,
      });

      if (mission.workflowId) {
        await wakeMission(input.missionId, {
          missionId: input.missionId,
          reason: "manual",
          metadata: {
            approvalId: input.approvalId,
            approved: input.approved,
            resolvedById: ctx.session.user.id,
            reason: input.reason,
          },
        });
      }

      return { approved: input.approved };
    }),

  readMemory: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        scope: z.string().optional(),
        agentId: z.string().optional(),
        key: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      if (input.key) {
        return getMissionMemory(ctx.prisma, {
          missionId: input.missionId,
          agentId: input.agentId,
          key: input.key,
          scope: input.scope,
        });
      }

      return listMissionMemory(ctx.prisma, input.missionId, {
        scope: input.scope,
        agentId: input.agentId,
      });
    }),

  writeMemory: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        key: z.string().min(1).max(255),
        value: z.unknown().refine((val) => {
          const serialized = JSON.stringify(val);
          return serialized !== undefined && serialized.length < 100_000;
        }, "Value must be JSON-serializable and under 100KB"),
        scope: z.string().default("mission"),
        agentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mission = await verifyMissionAccess(
        ctx.prisma,
        input.missionId,
        ctx.teamId
      );

      if (mission.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only write memory for active missions",
        });
      }

      return upsertMissionMemory(ctx.prisma, {
        missionId: input.missionId,
        agentId: input.agentId,
        key: input.key,
        value: input.value,
        scope: input.scope,
      });
    }),

  getArtifact: withActiveTeam
    .input(
      z.object({
        missionId: z.string(),
        runId: z.string(),
        artifactIndex: z.number().int().min(0),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyMissionAccess(ctx.prisma, input.missionId, ctx.teamId);

      const run = await getMissionRun(ctx.prisma, input.runId, input.missionId);

      if (!run) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Run not found",
        });
      }

      const artifacts = z.array(z.unknown()).parse(run.artifacts ?? []);
      if (input.artifactIndex >= artifacts.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Artifact index out of range",
        });
      }

      return artifacts[input.artifactIndex];
    }),
});
