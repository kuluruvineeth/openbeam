/**
 * Groups Router
 * Manage external groups synced from connectors
 */

import {
  getGroupById,
  getGroupStats,
  getGroupTypes,
  listGroupsByConnector,
  verifyConnectorOwnership,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "./middleware";

// ============================================================================
// Schemas
// ============================================================================

const listGroupsSchema = z.object({
  connectorId: z.string(),
  groupType: z.string().optional(),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// Router
// ============================================================================

export const groupsRouter = createTRPCRouter({
  /**
   * List external groups for a connector
   */
  list: withActiveTeam.input(listGroupsSchema).query(async ({ ctx, input }) => {
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

    const result = await listGroupsByConnector(ctx.prisma, input.connectorId, {
      groupType: input.groupType,
      search: input.search,
      isActive: input.isActive,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      groups: result.groups,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: result.total,
        hasMore: input.offset + result.groups.length < result.total,
      },
    };
  }),

  /**
   * Get group by ID
   */
  get: withActiveTeam
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await getGroupById(ctx.prisma, input.groupId, ctx.teamId);
      return group;
    }),

  /**
   * Get group types for a connector
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

      return getGroupTypes(ctx.prisma, input.connectorId);
    }),

  /**
   * Get group stats for a connector
   */
  stats: withActiveTeam
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

      return getGroupStats(ctx.prisma, input.connectorId);
    }),
});
