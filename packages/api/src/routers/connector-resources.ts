import {
  getConnectorResourceById,
  getConnectorResourceTypes,
  listConnectorResources,
  listConnectorResourcesByType,
  listEnabledConnectorResources,
} from "@openplane/db";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { verifyConnectorAccess, withActiveTeam } from "./apps/middleware";

const listResourcesSchema = z.object({
  connectorId: z.string(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
});

const listByTypeSchema = z.object({
  connectorId: z.string(),
  resourceType: z.string(),
  syncEnabled: z.boolean().optional(),
});

const getTypesSchema = z.object({
  connectorId: z.string(),
});

const getResourceSchema = z.object({
  resourceId: z.string(),
});

export const connectorResourcesRouter = createTRPCRouter({
  list: withActiveTeam
    .input(listResourcesSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);

      return listConnectorResources(ctx.prisma, input.connectorId, {
        search: input.search,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  listByType: withActiveTeam
    .input(listByTypeSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);

      return listConnectorResourcesByType(
        ctx.prisma,
        input.connectorId,
        input.resourceType,
        { syncEnabled: input.syncEnabled }
      );
    }),

  listEnabled: withActiveTeam
    .input(
      z.object({ connectorId: z.string(), resourceType: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);

      return listEnabledConnectorResources(
        ctx.prisma,
        input.connectorId,
        input.resourceType
      );
    }),

  getTypes: withActiveTeam
    .input(getTypesSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);

      return getConnectorResourceTypes(ctx.prisma, input.connectorId);
    }),

  get: withActiveTeam.input(getResourceSchema).query(async ({ ctx, input }) => {
    const resource = await getConnectorResourceById(
      ctx.prisma,
      input.resourceId
    );

    if (!resource) {
      return null;
    }

    await verifyConnectorAccess(ctx.prisma, resource.connectorId, ctx.teamId);

    return resource;
  }),
});
