import {
  archiveAgentCanvas,
  countAgentCanvases,
  createAgentCanvas,
  createAgentCanvasExecution,
  deleteAgentCanvas,
  findAgentCanvasById,
  findAgentCanvasExecution,
  listAgentCanvasExecutions,
  listAgentCanvases,
  listAgentCanvasTemplates,
  listPendingApprovals,
  publishAgentCanvas,
  respondToApproval,
  updateAgentCanvas,
} from "@openplane/db";
import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
  AgentCanvasSettingsSchema,
  TriggerConfigSchema,
  ViewportSchema,
} from "@openplane/types/canvas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam, withAdminRole } from "./apps/middleware";

const AgentCanvasStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const AgentTriggerTypeSchema = z.enum([
  "MANUAL",
  "SCHEDULE",
  "WEBHOOK",
  "EVENT",
]);

const listCanvasesSchema = z.object({
  status: AgentCanvasStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const canvasIdSchema = z.object({
  canvasId: z.string(),
});

const createCanvasSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: TriggerConfigSchema.optional(),
});

const updateCanvasSchema = z.object({
  canvasId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema).optional(),
  edges: z.array(AgentCanvasEdgeSchema).optional(),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: TriggerConfigSchema.optional(),
});

const publishCanvasSchema = z.object({
  canvasId: z.string(),
  changelog: z.string().max(1000).optional(),
});

const listExecutionsSchema = z.object({
  canvasId: z.string(),
  status: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const executionIdSchema = z.object({
  executionId: z.string(),
});

const createExecutionSchema = z.object({
  canvasId: z.string(),
  input: z.unknown().optional(),
  triggerSource: z.string().optional(),
});

const approvalResponseSchema = z.object({
  approvalId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  responseMessage: z.string().max(500).optional(),
});

const listTemplatesSchema = z.object({
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

async function verifyCanvasAccess(
  prisma: Parameters<typeof findAgentCanvasById>[0],
  canvasId: string,
  teamId: string
) {
  const canvas = await findAgentCanvasById(prisma, canvasId, teamId);

  if (!canvas) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent canvas not found",
    });
  }

  return canvas;
}

export const agentCanvasRouter = createTRPCRouter({
  list: withActiveTeam
    .input(listCanvasesSchema)
    .query(async ({ ctx, input }) => {
      const [items, total] = await Promise.all([
        listAgentCanvases(ctx.prisma, ctx.teamId, {
          status: input.status,
          limit: input.limit + 1,
          offset: input.offset,
        }),
        countAgentCanvases(ctx.prisma, ctx.teamId, input.status),
      ]);

      const hasMore = items.length > input.limit;
      const canvases = hasMore ? items.slice(0, -1) : items;

      return {
        items: canvases,
        total,
        hasMore,
        nextOffset: hasMore ? input.offset + canvases.length : undefined,
      };
    }),

  get: withActiveTeam
    .input(canvasIdSchema)
    .query(async ({ ctx, input }) =>
      verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId)
    ),

  create: withActiveTeam
    .input(createCanvasSchema)
    .mutation(async ({ ctx, input }) =>
      createAgentCanvas(ctx.prisma, {
        name: input.name,
        description: input.description,
        icon: input.icon,
        nodes: input.nodes,
        edges: input.edges,
        viewport: input.viewport,
        settings: input.settings,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        teamId: ctx.teamId,
        createdById: ctx.session.user.id,
      })
    ),

  update: withActiveTeam
    .input(updateCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return updateAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        name: input.name,
        description: input.description,
        icon: input.icon,
        nodes: input.nodes,
        edges: input.edges,
        viewport: input.viewport,
        settings: input.settings,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
      });
    }),

  publish: withAdminRole
    .input(publishCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);
      return publishAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        publishedById: ctx.session.user.id,
        changelog: input.changelog,
      });
    }),

  archive: withAdminRole
    .input(canvasIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);
      await archiveAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId);
      return { success: true };
    }),

  delete: withAdminRole
    .input(canvasIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      const result = await deleteAgentCanvas(
        ctx.prisma,
        input.canvasId,
        ctx.teamId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent canvas not found",
        });
      }

      return { success: true };
    }),

  listExecutions: withActiveTeam
    .input(listExecutionsSchema)
    .query(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      const items = await listAgentCanvasExecutions(
        ctx.prisma,
        input.canvasId,
        {
          status: input.status,
          limit: input.limit + 1,
          offset: input.offset,
        }
      );

      const hasMore = items.length > input.limit;
      const executions = hasMore ? items.slice(0, -1) : items;

      return {
        items: executions,
        hasMore,
        nextOffset: hasMore ? input.offset + executions.length : undefined,
      };
    }),

  getExecution: withActiveTeam
    .input(executionIdSchema)
    .query(async ({ ctx, input }) => {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      return execution;
    }),

  createExecution: withActiveTeam
    .input(createExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      const canvas = await verifyCanvasAccess(
        ctx.prisma,
        input.canvasId,
        ctx.teamId
      );

      if (canvas.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only execute published canvases",
        });
      }

      return createAgentCanvasExecution(ctx.prisma, {
        agentCanvasId: input.canvasId,
        versionNumber: canvas.version,
        input: input.input,
        trace: { steps: [] },
        triggeredById: ctx.session.user.id,
        triggerSource: input.triggerSource,
      });
    }),

  listPendingApprovals: withActiveTeam.query(async ({ ctx }) =>
    listPendingApprovals(ctx.prisma, ctx.teamId, ctx.session.user.id)
  ),

  respondToApproval: withActiveTeam
    .input(approvalResponseSchema)
    .mutation(async ({ ctx, input }) =>
      respondToApproval(ctx.prisma, input.approvalId, ctx.teamId, {
        status: input.status,
        responseMessage: input.responseMessage,
        respondedById: ctx.session.user.id,
      })
    ),

  listTemplates: withActiveTeam
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) =>
      listAgentCanvasTemplates(ctx.prisma, {
        teamId: ctx.teamId,
        category: input.category,
        isPublic: input.isPublic,
        limit: input.limit,
        offset: input.offset,
      })
    ),
});
