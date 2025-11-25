/**
 * Identities Router
 * Manage external identities synced from connectors
 */

import {
  getIdentityById,
  getIdentityStats,
  linkIdentityToUser,
  listIdentitiesByConnector,
  unlinkIdentity,
  verifyConnectorOwnership,
  verifyIdentityTeamAccess,
  verifyUserTeamMembership,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "./middleware";

// ============================================================================
// Schemas
// ============================================================================

const listIdentitiesSchema = z.object({
  connectorId: z.string(),
  search: z.string().optional(),
  isBot: z.boolean().optional(),
  isActive: z.boolean().optional(),
  linked: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const linkIdentitySchema = z.object({
  identityId: z.string(),
  userId: z.string(),
});

// ============================================================================
// Router
// ============================================================================

export const identitiesRouter = createTRPCRouter({
  /**
   * List external identities for a connector
   */
  list: withActiveTeam
    .input(listIdentitiesSchema)
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

      const result = await listIdentitiesByConnector(
        ctx.prisma,
        input.connectorId,
        {
          search: input.search,
          isBot: input.isBot,
          isActive: input.isActive,
          linked: input.linked,
          limit: input.limit,
          offset: input.offset,
        }
      );

      return {
        identities: result.identities,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.identities.length < result.total,
        },
      };
    }),

  /**
   * Get identity by ID
   */
  get: withActiveTeam
    .input(z.object({ identityId: z.string() }))
    .query(async ({ ctx, input }) => {
      const identity = await getIdentityById(
        ctx.prisma,
        input.identityId,
        ctx.teamId
      );

      return identity;
    }),

  /**
   * Link external identity to a user
   */
  link: withActiveTeam
    .input(linkIdentitySchema)
    .mutation(async ({ ctx, input }) => {
      // Verify identity belongs to team's connector
      const hasAccess = await verifyIdentityTeamAccess(
        ctx.prisma,
        input.identityId,
        ctx.teamId
      );

      if (!hasAccess) {
        return { success: false, error: "Identity not found" };
      }

      // Verify user belongs to team
      const isMember = await verifyUserTeamMembership(
        ctx.prisma,
        input.userId,
        ctx.teamId
      );

      if (!isMember) {
        return { success: false, error: "User not a member of this team" };
      }

      await linkIdentityToUser(ctx.prisma, input.identityId, input.userId);

      return { success: true };
    }),

  /**
   * Unlink external identity from user
   */
  unlink: withActiveTeam
    .input(z.object({ identityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const hasAccess = await verifyIdentityTeamAccess(
        ctx.prisma,
        input.identityId,
        ctx.teamId
      );

      if (!hasAccess) {
        return { success: false };
      }

      await unlinkIdentity(ctx.prisma, input.identityId);

      return { success: true };
    }),

  /**
   * Get identity stats for a connector
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

      return getIdentityStats(ctx.prisma, input.connectorId);
    }),
});
