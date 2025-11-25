/**
 * Resources Router
 * Manage connector resources (channels, folders, repos, etc.)
 */

import {
  bulkUpdateResources,
  getResourceById,
  getResourceSyncStats,
  getResourceTypes,
  listResourcesByConnector,
  updateResource,
  verifyConnectorOwnership,
  verifyResourcesTeamAccess,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "./middleware";

// ============================================================================
// Schemas
// ============================================================================

const listResourcesSchema = z.object({
  connectorId: z.string(),
  resourceType: z.string().optional(),
  syncEnabled: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const updateResourceSchema = z.object({
  resourceId: z.string(),
  syncEnabled: z.boolean().optional(),
  syncPriority: z.number().min(1).max(10).optional(),
});

const bulkUpdateResourcesSchema = z.object({
  resourceIds: z.array(z.string()),
  syncEnabled: z.boolean(),
});

// ============================================================================
// Router
// ============================================================================

export const resourcesRouter = createTRPCRouter({
  /**
   * List resources for a connector
   */
  list: withActiveTeam
    .input(listResourcesSchema)
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      const result = await listResourcesByConnector(
        ctx.prisma,
        input.connectorId,
        {
          resourceType: input.resourceType,
          syncEnabled: input.syncEnabled,
          search: input.search,
          limit: input.limit,
          offset: input.offset,
        }
      );

      return {
        resources: result.resources,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.resources.length < result.total,
        },
      };
    }),

  /**
   * Get resource by ID
   */
  get: withActiveTeam
    .input(z.object({ resourceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const resource = await getResourceById(
        ctx.prisma,
        input.resourceId,
        ctx.teamId
      );
      return resource;
    }),

  /**
   * Update resource sync settings
   */
  update: withActiveTeam
    .input(updateResourceSchema)
    .mutation(async ({ ctx, input }) => {
      const resource = await getResourceById(
        ctx.prisma,
        input.resourceId,
        ctx.teamId
      );

      if (!resource) {
        return { success: false, error: "Resource not found" };
      }

      const { resourceId, ...data } = input;

      await updateResource(ctx.prisma, resourceId, data);

      return { success: true };
    }),

  /**
   * Bulk update resource sync settings
   */
  bulkUpdate: withActiveTeam
    .input(bulkUpdateResourcesSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify all resources belong to team's connectors
      const validIds = await verifyResourcesTeamAccess(
        ctx.prisma,
        input.resourceIds,
        ctx.teamId
      );

      if (validIds.length === 0) {
        return { success: false, updated: 0 };
      }

      const updated = await bulkUpdateResources(ctx.prisma, validIds, {
        syncEnabled: input.syncEnabled,
      });

      return { success: true, updated };
    }),

  /**
   * Get resource types for a connector
   */
  types: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      return getResourceTypes(ctx.prisma, input.connectorId);
    }),

  /**
   * Get sync stats for resources
   */
  syncStats: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      return getResourceSyncStats(ctx.prisma, input.connectorId);
    }),
});
