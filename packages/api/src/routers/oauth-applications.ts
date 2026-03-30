import {
  createOAuthApplication,
  deleteOAuthApplication,
  findOAuthAppById,
  listAuthorizedApps,
  listOAuthAppsByTeam,
  regenerateOAuthSecret,
  revokeAllTokensForApp,
  updateOAuthApplication,
  updateOAuthAppStatus,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "..";
import { createTRPCRouter } from "../index";

export const oauthApplicationsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const teamId = ctx.session.user.teamId;
    if (!teamId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active team" });
    }
    return await listOAuthAppsByTeam(ctx.prisma, teamId);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const app = await findOAuthAppById(ctx.prisma, input.id);
      if (!app || app.teamId !== ctx.session.user.teamId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "App not found" });
      }
      return app;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        overview: z.string().max(5000).optional(),
        developerName: z.string().max(255).optional(),
        logoUrl: z.string().url().optional(),
        website: z.string().url().optional(),
        installUrl: z.string().url().optional(),
        screenshots: z.array(z.string().url()).max(4).optional(),
        redirectUris: z.array(z.string().url()).min(1),
        scopes: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      return await createOAuthApplication(ctx.prisma, {
        ...input,
        teamId,
        createdBy: ctx.session.user.id,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        overview: z.string().max(5000).optional(),
        developerName: z.string().max(255).optional(),
        logoUrl: z.string().url().nullable().optional(),
        website: z.string().url().nullable().optional(),
        installUrl: z.string().url().nullable().optional(),
        screenshots: z.array(z.string().url()).max(4).optional(),
        redirectUris: z.array(z.string().url()).min(1).optional(),
        scopes: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      const { id, ...data } = input;
      return await updateOAuthApplication(ctx.prisma, id, teamId, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      return await deleteOAuthApplication(ctx.prisma, input.id, teamId);
    }),

  regenerateSecret: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      return await regenerateOAuthSecret(ctx.prisma, input.id, teamId);
    }),

  updateApprovalStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["draft", "pending"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const teamId = ctx.session.user.teamId;
      if (!teamId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active team",
        });
      }
      return await updateOAuthAppStatus(
        ctx.prisma,
        input.id,
        teamId,
        input.status
      );
    }),

  authorized: protectedProcedure.query(
    async ({ ctx }) => await listAuthorizedApps(ctx.prisma, ctx.session.user.id)
  ),

  revokeAccess: protectedProcedure
    .input(z.object({ applicationId: z.string() }))
    .mutation(
      async ({ ctx, input }) =>
        await revokeAllTokensForApp(
          ctx.prisma,
          input.applicationId,
          ctx.session.user.id
        )
    ),
});
