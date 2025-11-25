/**
 * Shared tRPC Middleware
 *
 * Provides reusable middleware for team-scoped operations
 * to avoid redundant teamId checks across routers.
 */

import type { Database } from "@openplane/db";
import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "../context";
import { protectedProcedure, t } from "../index";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended context with team ID
 */
export type ContextWithTeam = TRPCContext & {
  session: NonNullable<TRPCContext["session"]>;
  teamId: string;
};

/**
 * Extended context with team ID and role
 */
export type ContextWithTeamRole = ContextWithTeam & {
  teamRole: TeamRole;
  isTeamAdmin: boolean;
};

export type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "MEMBER"
  | "VIEWER"
  | "GUEST";

// ============================================================================
// Middleware: Require Active Team
// ============================================================================

/**
 * Middleware to ensure user has an active team
 * Adds teamId to context
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
      message: "No active team. Please create or join a team.",
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
 * Use this for most team-scoped operations
 */
export const withActiveTeam = protectedProcedure.use(requireActiveTeam);

// ============================================================================
// Middleware: Require Team Role
// ============================================================================

/**
 * Middleware to ensure user has required role in their active team
 * Adds teamId and teamRole to context
 */
const requireTeamRole = (allowedRoles: TeamRole[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Get user's team membership
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        teamId: true,
        usersOnTeam: {
          where: {
            teamId: ctx.session.user.teamId || undefined,
          },
          select: { role: true, status: true },
        },
      },
    });

    const teamId = user?.teamId;
    const membership = user?.usersOnTeam[0];

    if (!teamId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active team",
      });
    }

    if (!membership || membership.status !== "active") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not an active member of this team",
      });
    }

    const teamRole = membership.role as TeamRole;

    if (!allowedRoles.includes(teamRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }

    const isTeamAdmin = teamRole === "OWNER" || teamRole === "ADMIN";

    return next({
      ctx: {
        ...ctx,
        teamId,
        teamRole,
        isTeamAdmin,
        session: ctx.session as NonNullable<TRPCContext["session"]>,
      } as ContextWithTeamRole,
    });
  });

/**
 * Procedure that requires OWNER role
 */
export const withOwner = protectedProcedure.use(requireTeamRole(["OWNER"]));

/**
 * Procedure that requires ADMIN or OWNER role
 */
export const withAdmin = protectedProcedure.use(
  requireTeamRole(["OWNER", "ADMIN"])
);

/**
 * Procedure that requires MANAGER or higher role
 */
export const withManager = protectedProcedure.use(
  requireTeamRole(["OWNER", "ADMIN", "MANAGER"])
);

/**
 * Procedure that requires MEMBER or higher role (excludes VIEWER, GUEST)
 */
export const withMember = protectedProcedure.use(
  requireTeamRole(["OWNER", "ADMIN", "MANAGER", "MEMBER"])
);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get access control IDs for permission checks
 */
export function getAccessControlIds(session: {
  user: { id: string; email?: string | null };
}): string[] {
  return [session.user.id, session.user.email].filter(Boolean) as string[];
}

/**
 * Verify resource ownership by team
 */
export async function verifyTeamOwnership<
  T extends { teamId: string | null } | null,
>(resource: T, teamId: string, resourceName = "Resource"): Promise<T & object> {
  if (!resource || resource.teamId !== teamId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${resourceName} not found or unauthorized`,
    });
  }
  return resource as T & object;
}

/**
 * Verify user can access resource based on visibility
 */
export function verifyVisibilityAccess(
  visibility: "PRIVATE" | "TEAM" | "PUBLIC",
  resourceUserId: string,
  currentUserId: string,
  resourceName = "Resource"
): void {
  if (visibility === "PRIVATE" && resourceUserId !== currentUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This ${resourceName.toLowerCase()} is private`,
    });
  }
}

/**
 * Common pagination helper
 */
export function getPaginationResult<T>(
  items: T[],
  limit: number,
  offset: number,
  total?: number
) {
  const hasMore = items.length === limit;
  return {
    items,
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : undefined,
      total,
    },
  };
}

/**
 * Generic resource verifier factory
 */
export function createResourceVerifier<T>(
  prisma: Database,
  model: keyof Database,
  teamIdField = "teamId"
) {
  return async (resourceId: string, teamId: string): Promise<T> => {
    // @ts-expect-error - Dynamic model access
    const resource = await prisma[model].findFirst({
      where: {
        id: resourceId,
        [teamIdField]: teamId,
      },
    });

    if (!resource) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Resource not found or unauthorized",
      });
    }

    return resource as T;
  };
}
