import {
  type Database,
  getTeamMembership,
  getUserById,
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

const requireActiveTeam = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const user = await getUserById(ctx.prisma, ctx.session.user.id);
  const teamId = user?.teamId ?? null;

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
  const membership = await getTeamMembership(
    ctx.prisma,
    teamCtx.session.user.id,
    teamCtx.teamId
  );
  const role = membership?.role ?? null;

  if (!role) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this team",
    });
  }

  if (role === "MEMBER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin or Owner role required",
    });
  }

  return next({
    ctx: { ...ctx, role } as ContextWithRole,
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
