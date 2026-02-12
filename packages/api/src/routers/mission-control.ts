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

      const queue: MissionEventPayload[] = [];
      let resolve: (() => void) | null = null;

      const unsubscribe = await createMissionEventSubscriber(
        input.missionId,
        resolvedRunId,
        (event) => {
          queue.push(event);
          resolve?.();
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
