/**
 * Team Queries
 * Query functions for team management
 */

import type {
  Team,
  TeamRole,
  UserInvite,
  UsersOnTeam,
} from "../../prisma/generated/client";
import type { Database } from "..";

// ============================================================================
// Types
// ============================================================================

export interface TeamWithRole {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: TeamRole;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: TeamRole;
  status: string;
  lastActiveAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface TeamInvite extends UserInvite {
  inviter: {
    id: string;
    name: string;
    email: string;
  };
}

// ============================================================================
// Team Queries
// ============================================================================

/**
 * List teams for a user
 */
export const listUserTeams = async (
  db: Database,
  userId: string
): Promise<TeamWithRole[]> => {
  const memberships = await db.usersOnTeam.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((membership) => ({
    id: membership.team.id,
    name: membership.team.name,
    slug: membership.team.slug,
    logoUrl: membership.team.logo ?? null,
    role: membership.role,
  }));
};

/**
 * Get team by ID
 */
export const getTeamById = async (
  db: Database,
  teamId: string
): Promise<Team | null> =>
  db.team.findUnique({
    where: { id: teamId },
  });

/**
 * Get team by slug
 */
export const getTeamBySlug = async (
  db: Database,
  slug: string
): Promise<Team | null> =>
  db.team.findUnique({
    where: { slug },
  });

/**
 * Check if slug is available
 */
export const isSlugAvailable = async (
  db: Database,
  slug: string
): Promise<boolean> => {
  const team = await db.team.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !team;
};

/**
 * Update active team for user
 */
export const updateActiveTeamForUser = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<void> => {
  const membership = await db.usersOnTeam.findFirst({
    where: { userId, teamId },
  });

  if (!membership) {
    throw new Error("User is not a member of this team");
  }

  await db.user.update({
    where: { id: userId },
    data: { teamId },
  });
};

// ============================================================================
// Member Queries
// ============================================================================

/**
 * List team members
 */
export const listTeamMembers = async (
  db: Database,
  teamId: string,
  options: { limit?: number; offset?: number; role?: TeamRole } = {}
): Promise<{ members: TeamMember[]; total: number }> => {
  const { limit = 50, offset = 0, role } = options;

  const where = {
    teamId,
    ...(role && { role }),
  };

  const [members, total] = await Promise.all([
    db.usersOnTeam.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    }),
    db.usersOnTeam.count({ where }),
  ]);

  return {
    members: members as TeamMember[],
    total,
  };
};

/**
 * Get member by user ID
 */
export const getTeamMember = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<UsersOnTeam | null> =>
  db.usersOnTeam.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

/**
 * Get member role
 */
export const getMemberRole = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<TeamRole | null> => {
  const member = await db.usersOnTeam.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  });
  return member?.role ?? null;
};

// ============================================================================
// Invite Queries
// ============================================================================

/**
 * List team invites
 */
export const listTeamInvites = async (
  db: Database,
  teamId: string,
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<{ invites: TeamInvite[]; total: number }> => {
  const { status = "pending", limit = 50, offset = 0 } = options;

  const where = {
    teamId,
    status,
  };

  const [invites, total] = await Promise.all([
    db.userInvite.findMany({
      where,
      include: {
        inviter: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.userInvite.count({ where }),
  ]);

  return {
    invites: invites as TeamInvite[],
    total,
  };
};

/**
 * Get invite by code
 */
export const getInviteByCode = async (
  db: Database,
  code: string
): Promise<UserInvite | null> =>
  db.userInvite.findUnique({
    where: { code },
  });

/**
 * Get invite by email for team
 */
export const getInviteByEmail = async (
  db: Database,
  teamId: string,
  email: string
): Promise<UserInvite | null> =>
  db.userInvite.findUnique({
    where: { teamId_email: { teamId, email } },
  });

/**
 * Check if user is already a member
 */
export const isTeamMember = async (
  db: Database,
  teamId: string,
  email: string
): Promise<boolean> => {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) return false;

  const member = await db.usersOnTeam.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });

  return !!member;
};
