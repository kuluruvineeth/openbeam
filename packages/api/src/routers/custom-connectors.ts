import { createHash, randomBytes } from "node:crypto";
import {
  countSyncRuns,
  createCustomConnectorApiKey,
  createCustomConnectorDefinition,
  deleteCustomConnectorDefinition,
  getCustomConnectorByConnectorId,
  getCustomConnectorBySlug,
  getMetricsBetween,
  listCustomConnectorApiKeys,
  listCustomConnectors,
  listSyncRuns,
  revokeCustomConnectorApiKey,
  updateCustomConnectorDefinition,
  upsertConnector,
} from "@openbeam/db";
import { getHealthScore } from "@openbeam/services";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { verifyConnectorAccess, withActiveTeam } from "./apps/middleware";

const API_KEY_PREFIX = "obc_";
const API_KEY_BYTE_LENGTH = 32;

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(API_KEY_BYTE_LENGTH);
  const raw = `${API_KEY_PREFIX}${bytes.toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).optional(),
  description: z.string().max(500).optional(),
  mode: z.enum(["push", "pull", "webhook"]),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateSchema = z.object({
  definitionId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

const generateKeySchema = z.object({
  definitionId: z.string().min(1),
  name: z.string().min(1).max(100),
});

const revokeKeySchema = z.object({
  definitionId: z.string().min(1),
  keyId: z.string().min(1),
});

const byDefinitionSchema = z.object({
  definitionId: z.string().min(1),
});

const byConnectorSchema = z.object({
  connectorId: z.string().min(1),
});

export const customConnectorsRouter = createTRPCRouter({
  create: withActiveTeam
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug || slugify(input.name);

      const existing = await getCustomConnectorBySlug(
        ctx.prisma,
        ctx.teamId,
        slug
      );
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A custom connector with this slug already exists",
        });
      }

      const connector = await upsertConnector(ctx.prisma, {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        app: "CUSTOM",
        name: input.name,
        type: "SOURCE",
        authType: "API_KEY",
        workspaceExternalId: `custom-${slug}`,
        config: {
          mode: input.mode,
          ...input.config,
        },
      });

      const definition = await createCustomConnectorDefinition(ctx.prisma, {
        teamId: ctx.teamId,
        connectorId: connector.id,
        slug,
        name: input.name,
        description: input.description,
      });

      const { raw, hash, prefix } = generateApiKey();

      await createCustomConnectorApiKey(ctx.prisma, {
        definitionId: definition.id,
        name: "Default",
        keyHash: hash,
        prefix,
      });

      return {
        definition,
        connectorId: connector.id,
        apiKey: raw,
        slug,
      };
    }),

  list: withActiveTeam.query(async ({ ctx }) =>
    listCustomConnectors(ctx.prisma, ctx.teamId)
  ),

  get: withActiveTeam
    .input(byDefinitionSchema)
    .query(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      return definition;
    }),

  getByConnector: withActiveTeam
    .input(byConnectorSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.connectorId
      );
      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector definition not found",
        });
      }
      return definition;
    }),

  update: withActiveTeam
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      return updateCustomConnectorDefinition(ctx.prisma, definition.id, {
        name: input.name,
        description: input.description,
      });
    }),

  delete: withActiveTeam
    .input(byDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      await deleteCustomConnectorDefinition(ctx.prisma, definition.id);
      return { success: true };
    }),

  generateApiKey: withActiveTeam
    .input(generateKeySchema)
    .mutation(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      const { raw, hash, prefix } = generateApiKey();
      await createCustomConnectorApiKey(ctx.prisma, {
        definitionId: definition.id,
        name: input.name,
        keyHash: hash,
        prefix,
      });
      return { apiKey: raw, prefix };
    }),

  revokeApiKey: withActiveTeam
    .input(revokeKeySchema)
    .mutation(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      await revokeCustomConnectorApiKey(ctx.prisma, input.keyId, definition.id);
      return { success: true };
    }),

  listApiKeys: withActiveTeam
    .input(byDefinitionSchema)
    .query(async ({ ctx, input }) => {
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.definitionId
      );
      if (!definition || definition.teamId !== ctx.teamId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector not found",
        });
      }
      return listCustomConnectorApiKeys(ctx.prisma, definition.id);
    }),

  getHealthScore: withActiveTeam
    .input(byConnectorSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getHealthScore(ctx.prisma, input.connectorId);
    }),

  listSyncRuns: withActiveTeam
    .input(
      z.object({
        connectorId: z.string().min(1),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.connectorId
      );
      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector definition not found",
        });
      }
      const [items, total] = await Promise.all([
        listSyncRuns(ctx.prisma, definition.id, {
          limit: input.limit,
          offset: input.offset,
        }),
        countSyncRuns(ctx.prisma, definition.id),
      ]);
      return { items, total };
    }),

  getMetrics: withActiveTeam
    .input(
      z.object({
        connectorId: z.string().min(1),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const definition = await getCustomConnectorByConnectorId(
        ctx.prisma,
        input.connectorId
      );
      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Custom connector definition not found",
        });
      }
      return getMetricsBetween(
        ctx.prisma,
        definition.id,
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
});
