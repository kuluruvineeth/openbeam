import {
  type Database,
  type TeamRole,
  verifyConnectorOwnership,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../../context";
import { protectedProcedure, t } from "../../index";

type ContextWithTeam = TRPCContext & {
  session: NonNullable<TRPCContext["session"]>;
  teamId: string;
};

type ContextWithRole = ContextWithTeam & {
  role: TeamRole;
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

export const withActiveTeam = protectedProcedure.use(requireActiveTeam);

const requireAdminRole = t.middleware(async ({ ctx, next }) => {
  const teamCtx = ctx as ContextWithTeam;
  const membership = await ctx.prisma.usersOnTeam.findUnique({
    where: {
      userId_teamId: {
        userId: teamCtx.session.user.id,
        teamId: teamCtx.teamId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this team",
    });
  }

  if (membership.role === "MEMBER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or Owner role required",
    });
  }

  return next({
    ctx: { ...ctx, role: membership.role } as ContextWithRole,
  });
});

export const withAdminRole = withActiveTeam.use(requireAdminRole);

export async function verifyConnectorAccess(
  prisma: Database,
  connectorId: string,
  teamId: string
): Promise<{ id: string; status: string; teamId: string; app: string }> {
  const connector = await verifyConnectorOwnership(prisma, connectorId, teamId);

  if (!connector) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Connector not found or unauthorized",
    });
  }

  return connector;
}
