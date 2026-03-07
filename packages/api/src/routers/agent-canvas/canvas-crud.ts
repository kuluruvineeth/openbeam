import {
  archiveAgentCanvas,
  createAgentCanvas,
  deleteAgentCanvas,
  duplicateAgentCanvas,
  listAgentCanvases,
  listAgentCanvasTemplates,
  publishAgentCanvas,
  updateAgentCanvas,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { withActiveTeam, withAdminRole } from "../apps/middleware";
import { verifyCanvasAccess } from "./helpers";
import {
  canvasIdSchema,
  createCanvasSchema,
  duplicateCanvasSchema,
  listCanvasesSchema,
  listTemplatesSchema,
  publishCanvasSchema,
  updateCanvasSchema,
} from "./schemas";

export const canvasCrudProcedures = {
  list: withActiveTeam
    .input(listCanvasesSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;

      const items = await listAgentCanvases(ctx.prisma, ctx.teamId, {
        status: input.status,
        limit: input.limit + 1,
        offset: effectiveOffset,
      });

      const hasMore = items.length > input.limit;
      const canvases = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore
        ? effectiveOffset + canvases.length
        : undefined;

      const total = hasMore
        ? effectiveOffset + input.limit + 1
        : effectiveOffset + canvases.length;

      return {
        items: canvases,
        total,
        hasMore,
        nextOffset: nextCursor,
        nextCursor,
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

  duplicate: withActiveTeam
    .input(duplicateCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return duplicateAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

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
};
