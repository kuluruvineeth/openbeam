import {
  deleteUserSearchProfile,
  findUserSearchProfile,
  upsertUserProfilePreferences,
} from "@openplane/db";
import { getUserProfileCache } from "@openplane/redis";
import { resolveUserProfile } from "@openplane/services/personalization/resolver";
import { updateTopicAffinity } from "@openplane/services/personalization/topic-affinity";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const cache = getUserProfileCache();

export const personalizationRouter = createTRPCRouter({
  getMyProfile: withActiveTeam.query(async ({ ctx }) => {
    const profile = await resolveUserProfile(ctx.prisma, {
      userId: ctx.session.user.id,
      email: ctx.session.user.email ?? null,
      teamId: ctx.teamId,
    });

    return {
      userId: profile.userId,
      teamId: profile.teamId,
      department: profile.department,
      searchCount: profile.searchCount,
      clickCount: profile.clickCount,
      avgDwellMs: profile.avgDwellMs,
      connectorPreferences: profile.connectorWeights,
      topicInterests: profile.topicWeights,
      hasEmbeddings: !!(profile.queryEmbedding || profile.docEmbedding),
      isNewUser: profile.isNewUser,
      personalizationEnabled: profile.personalizationEnabled,
      source: profile.source,
    };
  }),

  updatePreferences: withActiveTeam
    .input(
      z.object({
        personalizationEnabled: z.boolean().optional(),
        department: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfilePreferences(
        ctx.prisma,
        ctx.session.user.id,
        ctx.teamId,
        {
          personalizationEnabled: input.personalizationEnabled,
          department: input.department,
        }
      );

      await cache.invalidateProfile(ctx.teamId, ctx.session.user.id);

      return { updated: true };
    }),

  refreshTopicAffinity: withActiveTeam.mutation(async ({ ctx }) => {
    await updateTopicAffinity({
      db: ctx.prisma,
      userId: ctx.session.user.id,
      teamId: ctx.teamId,
    });

    return { refreshed: true };
  }),

  clearProfile: withActiveTeam.mutation(async ({ ctx }) => {
    try {
      await deleteUserSearchProfile(
        ctx.prisma,
        ctx.session.user.id,
        ctx.teamId
      );
    } catch {
      // Profile may not exist - that's fine
    }

    await cache.invalidateProfile(ctx.teamId, ctx.session.user.id);

    return { cleared: true };
  }),

  getConnectorStats: withActiveTeam.query(async ({ ctx }) => {
    const profile = await findUserSearchProfile(
      ctx.prisma,
      ctx.session.user.id,
      ctx.teamId
    );

    if (!profile) {
      return [];
    }

    const weights = profile.connectorWeights;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);

    return Object.entries(weights)
      .map(([connector, weight]) => ({
        connector,
        weight,
        percentage: total > 0 ? (weight / total) * 100 : 0,
      }))
      .sort((a, b) => b.weight - a.weight);
  }),

  getTopAuthors: withActiveTeam
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const profile = await findUserSearchProfile(
        ctx.prisma,
        ctx.session.user.id,
        ctx.teamId
      );

      if (!profile) {
        return [];
      }

      const interactions = profile.authorInteractions;

      return Object.entries(interactions)
        .map(([authorId, count]) => ({ authorId, interactionCount: count }))
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, input.limit);
    }),
});
