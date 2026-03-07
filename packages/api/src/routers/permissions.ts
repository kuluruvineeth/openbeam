import {
  getConnectorIdsByTeam,
  getDocumentPermissions,
  getPermissionSyncStatus,
  getPermissionSyncStatusesByTeam,
  getTeamMembership,
  getTeamPermissionStats,
  getUserConnectorScopes,
  getUserGroupMemberships,
} from "@openbeam/db";
import { getPermissionCache } from "@openbeam/redis";
import { resolvePermissions } from "@openbeam/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam, withAdminRole } from "./apps/middleware";

const cache = getPermissionCache();

async function requireAdminForOtherUser(
  prisma: Parameters<typeof getTeamMembership>[0],
  currentUserId: string,
  targetUserId: string | undefined,
  teamId: string
): Promise<void> {
  if (!targetUserId || targetUserId === currentUserId) {
    return;
  }

  const membership = await getTeamMembership(prisma, currentUserId, teamId);

  if (!membership || membership.role === "MEMBER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or Owner role required to view other users",
    });
  }
}

export const permissionsRouter = createTRPCRouter({
  getSyncStatus: withActiveTeam
    .input(z.object({ connectorId: z.string().min(1) }).strict())
    .query(async ({ ctx, input }) => {
      const status = await getPermissionSyncStatus(
        ctx.prisma,
        input.connectorId
      );

      if (!status || status.teamId !== ctx.teamId) {
        return null;
      }

      return status;
    }),

  listSyncStatuses: withActiveTeam.query(async ({ ctx }) =>
    getPermissionSyncStatusesByTeam(ctx.prisma, ctx.teamId)
  ),

  invalidateCache: withAdminRole
    .input(
      z
        .object({
          scope: z.enum(["user", "connector", "all"]),
          userId: z.string().min(1).optional(),
          connectorId: z.string().min(1).optional(),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      if (input.scope === "user" && input.userId) {
        await cache.invalidateUser(ctx.teamId, input.userId);
      } else if (input.scope === "connector" && input.connectorId) {
        await cache.invalidateConnector(ctx.teamId, input.connectorId);
      } else if (input.scope === "all") {
        const connectors = await getConnectorIdsByTeam(ctx.prisma, ctx.teamId);

        for (const connector of connectors) {
          await cache.invalidateConnector(ctx.teamId, connector.id);
        }
      }

      return { invalidated: true };
    }),

  getMyPermissions: withActiveTeam.query(async ({ ctx }) => {
    const membership = await getTeamMembership(
      ctx.prisma,
      ctx.session.user.id,
      ctx.teamId
    );

    return resolvePermissions(ctx.prisma, {
      userId: ctx.session.user.id,
      email: ctx.session.user.email ?? null,
      teamId: ctx.teamId,
      isTeamAdmin: membership?.role === "OWNER" || membership?.role === "ADMIN",
    });
  }),

  getDocumentPermissions: withActiveTeam
    .input(z.object({ documentId: z.string().min(1).max(255) }).strict())
    .query(async ({ ctx, input }) =>
      getDocumentPermissions(ctx.prisma, input.documentId, ctx.teamId)
    ),

  getUserGroups: withActiveTeam
    .input(z.object({ userId: z.string().min(1).optional() }).strict())
    .query(async ({ ctx, input }) => {
      await requireAdminForOtherUser(
        ctx.prisma,
        ctx.session.user.id,
        input.userId,
        ctx.teamId
      );

      const userId = input.userId ?? ctx.session.user.id;
      return getUserGroupMemberships(ctx.prisma, userId, ctx.teamId);
    }),

  getUserConnectorScopes: withActiveTeam
    .input(z.object({ userId: z.string().min(1).optional() }).strict())
    .query(async ({ ctx, input }) => {
      await requireAdminForOtherUser(
        ctx.prisma,
        ctx.session.user.id,
        input.userId,
        ctx.teamId
      );

      const userId = input.userId ?? ctx.session.user.id;
      return getUserConnectorScopes(ctx.prisma, userId, ctx.teamId);
    }),

  getStats: withAdminRole.query(async ({ ctx }) =>
    getTeamPermissionStats(ctx.prisma, ctx.teamId)
  ),
});
