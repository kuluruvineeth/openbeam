import type { Entity, EntityRelation } from "@openbeam/db";
import {
  getEntityById,
  getEntityMentions,
  getEntityRelations,
  getExpertiseRelations,
  getExpertsForTopic,
  listEntities,
  searchEntities,
} from "@openbeam/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { withActiveTeam } from "./apps/middleware";

const EntityTypeSchema = z.enum([
  "PERSON",
  "TEAM",
  "PROJECT",
  "TOPIC",
  "TECHNOLOGY",
  "LOCATION",
  "ORGANIZATION",
  "CHANNEL",
  "REPOSITORY",
]);

export const knowledgeRouter = createTRPCRouter({
  getEntity: withActiveTeam
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const entity = await getEntityById(ctx.prisma, input.id);

      if (!entity || entity.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return entity;
    }),

  listEntities: withActiveTeam
    .input(
      z.object({
        type: EntityTypeSchema.optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) =>
      listEntities(ctx.prisma, {
        teamId: ctx.teamId,
        type: input.type,
        cursor: input.cursor,
        limit: input.limit,
      })
    ),

  searchEntities: withActiveTeam
    .input(
      z.object({
        query: z.string().min(1).max(100),
        type: EntityTypeSchema.optional(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) =>
      searchEntities(ctx.prisma, {
        teamId: ctx.teamId,
        query: input.query,
        type: input.type,
        limit: input.limit,
      })
    ),

  getRelations: withActiveTeam
    .input(
      z.object({
        entityId: z.string(),
        direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
      })
    )
    .query(async ({ ctx, input }) => {
      const entity = await getEntityById(ctx.prisma, input.entityId);
      if (!entity || entity.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return getEntityRelations(ctx.prisma, {
        entityId: input.entityId,
        direction: input.direction,
      });
    }),

  getExperts: withActiveTeam
    .input(
      z.object({
        topicId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const topic = await getEntityById(ctx.prisma, input.topicId);
      if (!topic || topic.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const relations = await getExpertsForTopic(
        ctx.prisma,
        input.topicId,
        input.limit
      );

      return relations.map((rel: EntityRelation & { fromEntity: Entity }) => ({
        person: rel.fromEntity,
        score: rel.weight,
      }));
    }),

  getExpertise: withActiveTeam
    .input(
      z.object({
        personId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const person = await getEntityById(ctx.prisma, input.personId);
      if (!person || person.teamId !== ctx.teamId || person.type !== "PERSON") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const relations = await getExpertiseRelations(
        ctx.prisma,
        input.personId,
        input.limit
      );

      return relations.map((rel: EntityRelation & { toEntity: Entity }) => ({
        topic: rel.toEntity,
        score: rel.weight,
      }));
    }),

  getKnowledgePanel: withActiveTeam
    .input(z.object({ entityId: z.string() }))
    .query(async ({ ctx, input }) => {
      const entity = await getEntityById(ctx.prisma, input.entityId);
      if (!entity || entity.teamId !== ctx.teamId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const [relations, expertise, recentMentions] = await Promise.all([
        getEntityRelations(ctx.prisma, {
          entityId: input.entityId,
          direction: "both",
        }),
        entity.type === "PERSON"
          ? getExpertiseRelations(ctx.prisma, input.entityId, 5)
          : Promise.resolve([]),
        getEntityMentions(ctx.prisma, input.entityId, 5),
      ]);

      return {
        entity,
        relations,
        expertise: expertise.map(
          (rel: EntityRelation & { toEntity: Entity }) => ({
            topic: rel.toEntity,
            score: rel.weight,
          })
        ),
        recentMentions,
      };
    }),
});
