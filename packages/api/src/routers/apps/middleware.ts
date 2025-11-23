import { type Database, verifyConnectorOwnership } from "@openplane/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../context";
import { protectedProcedure, t } from "../../index";

/**
 * Extended context with organization ID
 */
type ContextWithOrg = TRPCContext & {
  session: NonNullable<TRPCContext["session"]>;
  orgId: string;
};

/**
 * Middleware to ensure user has an active organization
 */
const requireActiveOrg = t.middleware(({ ctx, next }) => {
  const orgId = ctx.session?.session.activeOrganizationId;

  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No active organization",
    });
  }

  return next({
    ctx: {
      ...ctx,
      orgId,
      session: ctx.session as NonNullable<TRPCContext["session"]>,
    } as ContextWithOrg,
  });
});

/**
 * Procedure that requires an active organization
 */
export const withActiveOrg = protectedProcedure.use(requireActiveOrg);

/**
 * Helper to verify connector ownership (used in procedures after input parsing)
 */
export async function verifyConnectorAccess(
  prisma: Database,
  connectorId: string,
  orgId: string
) {
  const connector = await verifyConnectorOwnership(prisma, connectorId, orgId);

  if (!connector) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found or unauthorized",
    });
  }

  return connector;
}
