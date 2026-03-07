import {
  approveControlJoinRequestForTeam,
  createControlInviteForTeam,
  listControlInvitesForTeam,
  listControlJoinRequestsForTeam,
  listControlMembersForTeam,
  rejectControlJoinRequestForTeam,
  revokeControlInviteForTeam,
  updateControlMemberPermissions,
} from "@openbeam/services";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "../apps/middleware";
import { mapControlError } from "./middleware";

export const accessRouter = createTRPCRouter({
  createInvite: withActiveTeam
    .input(
      z.object({
        expiresInHours: z.number().int().positive().optional(),
        allowedJoinTypes: z.string().optional(),
        defaultsPayload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createControlInviteForTeam(ctx.prisma, {
          teamId: ctx.teamId,
          expiresInHours: input.expiresInHours,
          invitedByUserId: ctx.session.user.id,
          allowedJoinTypes: input.allowedJoinTypes,
          defaultsPayload: input.defaultsPayload,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),

  listInvites: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await listControlInvitesForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  revokeInvite: withActiveTeam
    .input(z.object({ inviteId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await revokeControlInviteForTeam(
          ctx.prisma,
          input.inviteId,
          ctx.teamId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  listJoinRequests: withActiveTeam
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listControlJoinRequestsForTeam(
          ctx.prisma,
          ctx.teamId,
          input.status
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  approveJoinRequest: withActiveTeam
    .input(
      z.object({
        requestId: z.string().min(1),
        createdAgentId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await approveControlJoinRequestForTeam(
          ctx.prisma,
          input.requestId,
          ctx.session.user.id,
          input.createdAgentId
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  rejectJoinRequest: withActiveTeam
    .input(z.object({ requestId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectControlJoinRequestForTeam(
          ctx.prisma,
          input.requestId,
          ctx.session.user.id
        );
      } catch (err) {
        mapControlError(err);
      }
    }),

  listMembers: withActiveTeam.query(async ({ ctx }) => {
    try {
      return await listControlMembersForTeam(ctx.prisma, ctx.teamId);
    } catch (err) {
      mapControlError(err);
    }
  }),

  updateMemberPermissions: withActiveTeam
    .input(
      z.object({
        principalType: z.enum(["USER", "AGENT"]),
        principalId: z.string().min(1),
        grants: z.array(
          z.object({
            permissionKey: z.string().min(1),
            scope: z.record(z.string(), z.unknown()).optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateControlMemberPermissions(ctx.prisma, {
          teamId: ctx.teamId,
          principalType: input.principalType,
          principalId: input.principalId,
          grants: input.grants,
          grantedByUserId: ctx.session.user.id,
        });
      } catch (err) {
        mapControlError(err);
      }
    }),
});
