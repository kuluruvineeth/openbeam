import {
  claimDCRApplication,
  createAuthorizationCode,
  createOAuthApplication,
  deleteOAuthApplication,
  findOAuthAppByClientId,
  findOAuthAppById,
  getTeamMembership,
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

  getApplicationInfo: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        redirectUri: z.string(),
        scope: z.string().optional(),
        state: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const app = await findOAuthAppByClientId(ctx.prisma, input.clientId);
      if (!app?.active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }
      if (!app.redirectUris.includes(input.redirectUri)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid redirect URI",
        });
      }
      const scopes = input.scope ? input.scope.split(" ").filter(Boolean) : [];
      return {
        id: app.id,
        name: app.name,
        description: app.description,
        logoUrl: app.logoUrl,
        website: app.website,
        clientId: app.clientId,
        scopes,
        redirectUri: input.redirectUri,
        state: input.state ?? "",
        status: app.status,
      };
    }),

  authorize: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        decision: z.enum(["allow", "deny"]),
        scopes: z.array(z.string()),
        redirectUri: z.string(),
        state: z.string(),
        codeChallenge: z.string().optional(),
        teamId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const app = await findOAuthAppByClientId(ctx.prisma, input.clientId);
      if (!app?.active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      if (!app.redirectUris.includes(input.redirectUri)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid redirect URI",
        });
      }

      const membership = await getTeamMembership(
        ctx.prisma,
        ctx.session.user.id,
        input.teamId
      );
      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this team",
        });
      }

      if (input.decision === "deny") {
        const params = new URLSearchParams({
          error: "access_denied",
          state: input.state,
        });
        return { redirectUrl: `${input.redirectUri}?${params.toString()}` };
      }

      if (!app.teamId) {
        await claimDCRApplication(
          ctx.prisma,
          app.id,
          input.teamId,
          ctx.session.user.id
        );
      }

      const { code } = await createAuthorizationCode(ctx.prisma, {
        applicationId: app.id,
        userId: ctx.session.user.id,
        teamId: input.teamId,
        scopes: input.scopes,
        redirectUri: input.redirectUri,
        codeChallenge: input.codeChallenge,
      });

      const params = new URLSearchParams({ code, state: input.state });
      return { redirectUrl: `${input.redirectUri}?${params.toString()}` };
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
