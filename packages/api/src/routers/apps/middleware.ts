import { type Database, verifyConnectorOwnership } from "@openplane/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../context";
import { protectedProcedure, t } from "../../index";

/**
 * Extended context with team ID
 */
type ContextWithTeam = TRPCContext & {
  session: NonNullable<TRPCContext["session"]>;
  teamId: string;
};

/**
 * Middleware to ensure user has an active team
 */
const requireActiveTeam = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // Get user's teamId from database
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { teamId: true },
  });

  const teamId = user?.teamId;

  if (!teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active team",
    });
  }

  return next({
    ctx: {
      ...ctx,
      teamId,
      session: ctx.session as NonNullable<TRPCContext["session"]>,
    } as ContextWithTeam,
  });
});

/**
 * Procedure that requires an active team
 */
export const withActiveTeam = protectedProcedure.use(requireActiveTeam);

/**
 * Helper to verify connector ownership (used in procedures after input parsing)
 */
export async function verifyConnectorAccess(
  prisma: Database,
  connectorId: string,
  teamId: string
) {
  const connector = await verifyConnectorOwnership(prisma, connectorId, teamId);

  if (!connector) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found or unauthorized",
    });
  }

  return connector;
}
