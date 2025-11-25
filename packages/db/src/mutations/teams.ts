/**
 * Team Mutations
 * Mutation functions for team management
 */

import { randomBytes } from "node:crypto";
import {
  type Prisma,
  type Team,
  TeamRole,
  type UserInvite,
  type UsersOnTeam,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Types
// ============================================================================

export interface CreateTeamInput {
  name: string;
  slug: string;
  userId: string;
}

export interface UpdateTeamInput {
  name?: string;
  logo?: string;
  icon?: string;
  color?: string;
  settings?: Prisma.InputJsonValue;
}

export interface CreateInviteInput {
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  personalMessage?: string;
  customPermissions?: string[];
  groupIds?: string[];
}

// ============================================================================
// Team Mutations
// ============================================================================

/**
 * Create a team
 */
export const createTeam = async (
  db: Database,
  input: CreateTeamInput
): Promise<{ id: string; name: string; slug: string }> =>
  db.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name: input.name,
        slug: input.slug,
      },
    });

    await tx.usersOnTeam.create({
      data: {
        userId: input.userId,
        teamId: team.id,
        role: TeamRole.OWNER,
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { teamId: team.id },
    });

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
    };
  });

/**
 * Update team settings
 */
export const updateTeam = async (
  db: Database,
  teamId: string,
  data: UpdateTeamInput
): Promise<Team> =>
  db.team.update({
    where: { id: teamId },
    data,
  });

/**
 * Delete team (soft delete)
 */
export const deleteTeam = async (db: Database, teamId: string): Promise<Team> =>
  db.team.update({
    where: { id: teamId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

// ============================================================================
// Member Mutations
// ============================================================================

/**
 * Add member to team
 */
export const addTeamMember = async (
  db: Database,
  teamId: string,
  userId: string,
  role: TeamRole,
  invitedBy?: string
): Promise<UsersOnTeam> => {
  // Update team member count
  await db.team.update({
    where: { id: teamId },
    data: { currentUsers: { increment: 1 } },
  });

  return db.usersOnTeam.create({
    data: {
      teamId,
      userId,
      role,
      invitedBy,
      invitedAt: invitedBy ? new Date() : undefined,
      acceptedAt: new Date(),
    },
  });
};

/**
 * Update member role
 */
export const updateMemberRole = async (
  db: Database,
  teamId: string,
  userId: string,
  role: TeamRole
): Promise<UsersOnTeam> =>
  db.usersOnTeam.update({
    where: { userId_teamId: { userId, teamId } },
    data: { role },
  });

/**
 * Update member permissions
 */
export const updateMemberPermissions = async (
  db: Database,
  teamId: string,
  userId: string,
  customPermissions: string[]
): Promise<UsersOnTeam> =>
  db.usersOnTeam.update({
    where: { userId_teamId: { userId, teamId } },
    data: { customPermissions },
  });

/**
 * Remove member from team
 */
export const removeTeamMember = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<boolean> => {
  try {
    await db.$transaction(async (tx) => {
      // Delete membership
      await tx.usersOnTeam.delete({
        where: { userId_teamId: { userId, teamId } },
      });

      // Update member count
      await tx.team.update({
        where: { id: teamId },
        data: { currentUsers: { decrement: 1 } },
      });

      // If this was user's active team, clear it
      await tx.user.updateMany({
        where: { id: userId, teamId },
        data: { teamId: null },
      });
    });

    return true;
  } catch {
    return false;
  }
};

/**
 * Suspend member
 */
export const suspendTeamMember = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<UsersOnTeam> =>
  db.usersOnTeam.update({
    where: { userId_teamId: { userId, teamId } },
    data: { status: "suspended" },
  });

/**
 * Reactivate member
 */
export const reactivateTeamMember = async (
  db: Database,
  teamId: string,
  userId: string
): Promise<UsersOnTeam> =>
  db.usersOnTeam.update({
    where: { userId_teamId: { userId, teamId } },
    data: { status: "active" },
  });

// ============================================================================
// Invite Mutations
// ============================================================================

/**
 * Generate invite code
 */
function generateInviteCode(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Create team invite
 */
export const createTeamInvite = async (
  db: Database,
  input: CreateInviteInput
): Promise<UserInvite> => {
  const code = generateInviteCode();

  return db.userInvite.create({
    data: {
      teamId: input.teamId,
      email: input.email.toLowerCase(),
      role: input.role,
      code,
      invitedBy: input.invitedBy,
      personalMessage: input.personalMessage,
      customPermissions: input.customPermissions ?? [],
      groupIds: input.groupIds ?? [],
    },
  });
};

/**
 * Accept invite
 */
export const acceptTeamInvite = async (
  db: Database,
  code: string,
  userId: string
): Promise<{ teamId: string; role: TeamRole }> => {
  return db.$transaction(async (tx) => {
    // Get invite
    const invite = await tx.userInvite.findUnique({
      where: { code },
    });

    if (!invite || invite.status !== "pending") {
      throw new Error("Invalid or expired invite");
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error("Invite has expired");
    }

    // Create membership
    await tx.usersOnTeam.create({
      data: {
        teamId: invite.teamId,
        userId,
        role: invite.role,
        customPermissions: invite.customPermissions,
        invitedBy: invite.invitedBy,
        invitedAt: invite.createdAt,
        acceptedAt: new Date(),
      },
    });

    // Update team member count
    await tx.team.update({
      where: { id: invite.teamId },
      data: { currentUsers: { increment: 1 } },
    });

    // Mark invite as accepted
    await tx.userInvite.update({
      where: { code },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedBy: userId,
      },
    });

    return { teamId: invite.teamId, role: invite.role };
  });
};

/**
 * Revoke invite
 */
export const revokeTeamInvite = async (
  db: Database,
  teamId: string,
  inviteId: string,
  revokedBy: string
): Promise<UserInvite> =>
  db.userInvite.update({
    where: { id: inviteId, teamId },
    data: {
      status: "revoked",
      revokedAt: new Date(),
      revokedBy,
    },
  });

/**
 * Resend invite (regenerate code and reset expiry)
 */
export const resendTeamInvite = async (
  db: Database,
  teamId: string,
  inviteId: string
): Promise<UserInvite> => {
  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return db.userInvite.update({
    where: { id: inviteId, teamId },
    data: {
      code,
      expiresAt,
      status: "pending",
    },
  });
};

/**
 * Delete expired invites
 */
export const deleteExpiredInvites = async (db: Database): Promise<number> => {
  const result = await db.userInvite.deleteMany({
    where: {
      status: "pending",
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
};
