import {
  cancelBackgroundAgent,
  countBackgroundAgents,
  createBackgroundAgent,
  deleteBackgroundAgent,
  findBackgroundAgentById,
  getBackgroundAgentCheckpoints,
  getBackgroundAgentLogs,
  listBackgroundAgents,
} from "@openplane/db";
import {
  addBackgroundAgentJob,
  cancelBackgroundAgentJob,
  pauseBackgroundAgentJob,
  resumeBackgroundAgentJob,
} from "@openplane/redis";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const BackgroundAgentPresetSchema = z.enum([
  "researcher",
  "coder",
  "analyst",
  "writer",
  "custom",
]);

const BackgroundAgentStatusSchema = z.enum([
  "PENDING",
  "INITIALIZING",
  "RUNNING",
  "PAUSED",
  "AWAITING_INPUT",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

const SandboxTypeSchema = z.enum(["e2b", "docker", "local"]);

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  prompt: z.string().min(1).max(10_000),
  preset: BackgroundAgentPresetSchema.default("researcher"),
  sandboxType: SandboxTypeSchema.default("e2b"),
  repositoryUrl: z.string().url().optional(),
  baseBranch: z.string().optional(),
  maxSteps: z.number().int().positive().max(100).optional(),
  timeoutMs: z.number().int().positive().max(3_600_000).optional(),
});

const listAgentsSchema = z.object({
  status: BackgroundAgentStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

const agentIdSchema = z.object({
  agentId: z.string().uuid(),
});

const getLogsSchema = z.object({
  agentId: z.string().uuid(),
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  limit: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
});

const getCheckpointsSchema = z.object({
  agentId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(10),
});

async function verifyAgentAccess(
  prisma: Parameters<typeof findBackgroundAgentById>[0],
  agentId: string,
  teamId: string
) {
  const agent = await findBackgroundAgentById(prisma, agentId, teamId);

  if (!agent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Background agent not found",
    });
  }

  return agent;
}

export const backgroundAgentsRouter = createTRPCRouter({
  list: withActiveTeam.input(listAgentsSchema).query(async ({ ctx, input }) => {
    const [agents, total] = await Promise.all([
      listBackgroundAgents(ctx.prisma, ctx.teamId, undefined, {
        status: input.status,
        limit: input.limit + 1,
        offset: input.cursor ? Number.parseInt(input.cursor, 10) : 0,
      }),
      countBackgroundAgents(ctx.prisma, ctx.teamId, undefined, input.status),
    ]);

    const hasMore = agents.length > input.limit;
    const items = hasMore ? agents.slice(0, -1) : agents;
    const nextOffset = input.cursor
      ? Number.parseInt(input.cursor, 10) + items.length
      : items.length;

    return {
      items,
      total,
      nextCursor: hasMore ? String(nextOffset) : undefined,
      hasMore,
    };
  }),

  get: withActiveTeam
    .input(agentIdSchema)
    .query(async ({ ctx, input }) =>
      verifyAgentAccess(ctx.prisma, input.agentId, ctx.teamId)
    ),

  getCheckpoints: withActiveTeam
    .input(getCheckpointsSchema)
    .query(async ({ ctx, input }) => {
      await verifyAgentAccess(ctx.prisma, input.agentId, ctx.teamId);
      return getBackgroundAgentCheckpoints(
        ctx.prisma,
        input.agentId,
        input.limit
      );
    }),

  getLogs: withActiveTeam.input(getLogsSchema).query(async ({ ctx, input }) => {
    await verifyAgentAccess(ctx.prisma, input.agentId, ctx.teamId);
    return getBackgroundAgentLogs(ctx.prisma, input.agentId, {
      level: input.level,
      limit: input.limit,
      offset: input.offset,
    });
  }),

  create: withActiveTeam
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await createBackgroundAgent(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        name: input.name,
        description: input.description,
        prompt: input.prompt,
        preset: input.preset,
        sandboxType: input.sandboxType.toUpperCase() as
          | "E2B"
          | "DOCKER"
          | "LOCAL",
        repositoryUrl: input.repositoryUrl,
        baseBranch: input.baseBranch,
        timeoutMs: input.timeoutMs,
      });

      await addBackgroundAgentJob(
        {
          agentId: agent.id,
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
          name: input.name,
          prompt: input.prompt,
          preset: input.preset,
          sandboxType: input.sandboxType,
          repositoryUrl: input.repositoryUrl,
          baseBranch: input.baseBranch,
          maxSteps: input.maxSteps,
          timeoutMs: input.timeoutMs,
        },
        5
      );

      return agent;
    }),

  cancel: withActiveTeam
    .input(agentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyAgentAccess(
        ctx.prisma,
        input.agentId,
        ctx.teamId
      );

      const cancellableStatuses = [
        "PENDING",
        "INITIALIZING",
        "RUNNING",
        "PAUSED",
        "AWAITING_INPUT",
      ];

      if (!cancellableStatuses.includes(agent.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel agent in ${agent.status} status`,
        });
      }

      await cancelBackgroundAgentJob(input.agentId);
      return cancelBackgroundAgent(ctx.prisma, input.agentId, ctx.teamId);
    }),

  pause: withActiveTeam
    .input(agentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyAgentAccess(
        ctx.prisma,
        input.agentId,
        ctx.teamId
      );

      if (agent.status !== "RUNNING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only pause running agents",
        });
      }

      const paused = await pauseBackgroundAgentJob(input.agentId);

      if (!paused) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to pause agent job",
        });
      }

      return { success: true };
    }),

  resume: withActiveTeam
    .input(
      z.object({
        agentId: z.string().uuid(),
        fromCheckpoint: z.number().int().nonnegative().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyAgentAccess(
        ctx.prisma,
        input.agentId,
        ctx.teamId
      );

      if (agent.status !== "PAUSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resume paused agents",
        });
      }

      const resumed = await resumeBackgroundAgentJob(
        input.agentId,
        input.fromCheckpoint
      );

      if (!resumed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to resume agent job",
        });
      }

      return { success: true };
    }),

  delete: withActiveTeam
    .input(agentIdSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyAgentAccess(
        ctx.prisma,
        input.agentId,
        ctx.teamId
      );

      const activeStatuses = [
        "PENDING",
        "INITIALIZING",
        "RUNNING",
        "PAUSED",
        "AWAITING_INPUT",
      ];

      if (activeStatuses.includes(agent.status)) {
        await cancelBackgroundAgentJob(input.agentId);
      }

      return deleteBackgroundAgent(ctx.prisma, input.agentId, ctx.teamId);
    }),
});
