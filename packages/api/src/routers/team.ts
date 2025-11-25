/**
 * Team Router
 * Team management, members, and invites
 */

import {
  acceptTeamInvite,
  createTeam,
  createTeamInvite,
  deleteTeam,
  getInviteByCode,
  getInviteByEmail,
  getMemberRole,
  getTeamById,
  isSlugAvailable,
  isTeamMember,
  listTeamInvites,
  listTeamMembers,
  listUserTeams,
  reactivateTeamMember,
  removeTeamMember,
  resendTeamInvite,
  revokeTeamInvite,
  suspendTeamMember,
  updateActiveTeamForUser,
  updateMemberPermissions,
  updateMemberRole,
  updateTeam,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";
import { withActiveTeam, withAdmin, withOwner } from "../middleware";
import { generateUniqueSlug } from "../utils/slug";

// ============================================================================
// Schemas
// ============================================================================

const teamRoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"]);

const listMembersSchema = z.object({
  role: teamRoleEnum.optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createInviteSchema = z.object({
  email: z.string().email(),
  role: teamRoleEnum.default("MEMBER"),
  personalMessage: z.string().max(500).optional(),
  customPermissions: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  settings: z.record(z.unknown()).optional(),
});

// ============================================================================
// Router
// ============================================================================

export const teamRouter = createTRPCRouter({
  // ==========================================================================
  // Team CRUD
  // ==========================================================================

  /**
   * Generate a unique slug for team name
   */
  generateSlug: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const slug = await generateUniqueSlug(ctx.prisma, input.name);
      return { slug };
    }),

  /**
   * Check if slug is available
   */
  checkSlug: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const available = await isSlugAvailable(ctx.prisma, input.slug);
      return { available };
    }),

  /**
   * Create a team
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check slug availability
      const available = await isSlugAvailable(ctx.prisma, input.slug);
      if (!available) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Slug is already taken",
        });
      }

      return createTeam(ctx.prisma, {
        name: input.name,
        slug: input.slug,
        userId: ctx.session.user.id,
      });
    }),

  /**
   * List user's teams
   */
  list: protectedProcedure.query(({ ctx }) =>
    listUserTeams(ctx.prisma, ctx.session.user.id)
  ),

  /**
   * Get current team details
   */
  current: withActiveTeam.query(async ({ ctx }) => {
    const team = await getTeamById(ctx.prisma, ctx.teamId);
    if (!team) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found",
      });
    }
    return team;
  }),

  /**
   * Switch active team
   */
  switch: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await updateActiveTeamForUser(
        ctx.prisma,
        ctx.session.user.id,
        input.teamId
      );
      return { success: true };
    }),

  /**
   * Update team (Admin only)
   */
  update: withAdmin
    .input(updateTeamSchema)
    .mutation(async ({ ctx, input }) =>
      updateTeam(ctx.prisma, ctx.teamId, input)
    ),

  /**
   * Delete team (Owner only)
   */
  delete: withOwner.mutation(async ({ ctx }) => {
    await deleteTeam(ctx.prisma, ctx.teamId);
    return { success: true };
  }),

  // ==========================================================================
  // Members
  // ==========================================================================

  /**
   * List team members
   */
  listMembers: withActiveTeam
    .input(listMembersSchema)
    .query(async ({ ctx, input }) => {
      const result = await listTeamMembers(ctx.prisma, ctx.teamId, {
        role: input.role,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        members: result.members,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.members.length < result.total,
        },
      };
    }),

  /**
   * Get current user's role in team
   */
  myRole: withActiveTeam.query(async ({ ctx }) => {
    const role = await getMemberRole(
      ctx.prisma,
      ctx.teamId,
      ctx.session.user.id
    );
    return { role };
  }),

  /**
   * Update member role (Admin only, but can't change owners)
   */
  updateMemberRole: withAdmin
    .input(
      z.object({
        userId: z.string(),
        role: teamRoleEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent changing owner role (only owner can transfer ownership)
      const currentRole = await getMemberRole(
        ctx.prisma,
        ctx.teamId,
        input.userId
      );

      if (currentRole === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot change owner role",
        });
      }

      if (input.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Use transfer ownership to change owner",
        });
      }

      return updateMemberRole(ctx.prisma, ctx.teamId, input.userId, input.role);
    }),

  /**
   * Update member custom permissions (Admin only)
   */
  updateMemberPermissions: withAdmin
    .input(
      z.object({
        userId: z.string(),
        permissions: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) =>
      updateMemberPermissions(
        ctx.prisma,
        ctx.teamId,
        input.userId,
        input.permissions
      )
    ),

  /**
   * Remove member from team (Admin only)
   */
  removeMember: withAdmin
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent removing self
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove yourself. Use leave team instead.",
        });
      }

      // Prevent removing owner
      const role = await getMemberRole(ctx.prisma, ctx.teamId, input.userId);
      if (role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove team owner",
        });
      }

      const success = await removeTeamMember(
        ctx.prisma,
        ctx.teamId,
        input.userId
      );
      return { success };
    }),

  /**
   * Suspend member (Admin only)
   */
  suspendMember: withAdmin
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await getMemberRole(ctx.prisma, ctx.teamId, input.userId);
      if (role === "OWNER" || role === "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot suspend owner or admin",
        });
      }

      return suspendTeamMember(ctx.prisma, ctx.teamId, input.userId);
    }),

  /**
   * Reactivate member (Admin only)
   */
  reactivateMember: withAdmin
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      reactivateTeamMember(ctx.prisma, ctx.teamId, input.userId)
    ),

  /**
   * Leave team (any member except owner)
   */
  leave: withActiveTeam.mutation(async ({ ctx }) => {
    const role = await getMemberRole(
      ctx.prisma,
      ctx.teamId,
      ctx.session.user.id
    );

    if (role === "OWNER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Owner cannot leave. Transfer ownership first.",
      });
    }

    const success = await removeTeamMember(
      ctx.prisma,
      ctx.teamId,
      ctx.session.user.id
    );

    return { success };
  }),

  // ==========================================================================
  // Invites
  // ==========================================================================

  /**
   * List team invites (Admin only)
   */
  listInvites: withAdmin
    .input(
      z.object({
        status: z.string().default("pending"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await listTeamInvites(ctx.prisma, ctx.teamId, {
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        invites: result.invites,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.invites.length < result.total,
        },
      };
    }),

  /**
   * Create invite (Admin only)
   */
  createInvite: withAdmin
    .input(createInviteSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if already a member
      const isMember = await isTeamMember(ctx.prisma, ctx.teamId, input.email);
      if (isMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a team member",
        });
      }

      // Check for existing pending invite
      const existing = await getInviteByEmail(
        ctx.prisma,
        ctx.teamId,
        input.email
      );
      if (existing && existing.status === "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Invite already sent to this email",
        });
      }

      // Can't create owner invite
      if (input.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot invite as owner",
        });
      }

      return createTeamInvite(ctx.prisma, {
        teamId: ctx.teamId,
        email: input.email,
        role: input.role,
        invitedBy: ctx.session.user.id,
        personalMessage: input.personalMessage,
        customPermissions: input.customPermissions,
        groupIds: input.groupIds,
      });
    }),

  /**
   * Resend invite (Admin only)
   */
  resendInvite: withAdmin
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      resendTeamInvite(ctx.prisma, ctx.teamId, input.inviteId)
    ),

  /**
   * Revoke invite (Admin only)
   */
  revokeInvite: withAdmin
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) =>
      revokeTeamInvite(
        ctx.prisma,
        ctx.teamId,
        input.inviteId,
        ctx.session.user.id
      )
    ),

  /**
   * Get invite details by code (public)
   */
  getInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const invite = await getInviteByCode(ctx.prisma, input.code);

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite is no longer valid",
        });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      // Get team info
      const team = await getTeamById(ctx.prisma, invite.teamId);

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        team: team
          ? {
              id: team.id,
              name: team.name,
              logo: team.logo,
            }
          : null,
        personalMessage: invite.personalMessage,
      };
    }),

  /**
   * Accept invite
   */
  acceptInvite: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await acceptTeamInvite(
          ctx.prisma,
          input.code,
          ctx.session.user.id
        );

        return { success: true, teamId: result.teamId };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Failed to accept invite",
        });
      }
    }),

  // ==========================================================================
  // Transfer Ownership (Owner only)
  // ==========================================================================

  /**
   * Transfer ownership to another member
   */
  transferOwnership: withOwner
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify target is a member
      const role = await getMemberRole(ctx.prisma, ctx.teamId, input.userId);
      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User is not a member of this team",
        });
      }

      // Update roles
      await updateMemberRole(ctx.prisma, ctx.teamId, input.userId, "OWNER");
      await updateMemberRole(
        ctx.prisma,
        ctx.teamId,
        ctx.session.user.id,
        "ADMIN"
      );

      return { success: true };
    }),
});
