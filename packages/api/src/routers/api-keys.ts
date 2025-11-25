/**
 * API Keys Router
 * Manage API keys for SDKs and integrations
 */

import { createHash, randomBytes } from "node:crypto";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyWithAccess,
  getTeamApiKeys,
  getUserApiKeys,
  reactivateApiKey,
  revokeApiKey,
  rotateApiKey,
  updateApiKey,
  updateApiKeyRateLimit,
  updateApiKeyScopes,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "..";
import { withActiveTeam, withAdmin } from "../middleware";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a secure API key
 * Format: op_[type]_[random]
 */
function generateApiKey(type: string): {
  key: string;
  prefix: string;
  hash: string;
} {
  const typePrefix = type.toLowerCase().slice(0, 3);
  const random = randomBytes(24).toString("base64url");
  const key = `op_${typePrefix}_${random}`;
  const prefix = key.slice(0, 12); // op_xxx_xxxx
  const hash = createHash("sha256").update(key).digest("hex");

  return { key, prefix, hash };
}

// ============================================================================
// Schemas
// ============================================================================

const apiKeyTypeEnum = z.enum([
  "STANDARD",
  "RESTRICTED",
  "ADMIN",
  "SERVICE",
  "WEBHOOK",
  "EMBED",
]);

const listKeysSchema = z.object({
  type: apiKeyTypeEnum.optional(),
  activeOnly: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: apiKeyTypeEnum.default("STANDARD"),
  scopes: z.array(z.string()).default(["read"]),
  expiresAt: z.date().optional(),
  allowedIps: z.array(z.string()).default([]),
  allowedDomains: z.array(z.string()).default([]),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().min(1).optional(),
      requestsPerHour: z.number().min(1).optional(),
      requestsPerDay: z.number().min(1).optional(),
    })
    .default({}),
});

const updateKeySchema = z.object({
  keyId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  allowedIps: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().min(1).optional(),
      requestsPerHour: z.number().min(1).optional(),
      requestsPerDay: z.number().min(1).optional(),
    })
    .optional(),
});

const updateScopesSchema = z.object({
  keyId: z.string(),
  scopes: z.array(z.string()),
});

// ============================================================================
// Router
// ============================================================================

export const apiKeysRouter = createTRPCRouter({
  /**
   * List API keys (Admin: all keys, User: own keys)
   */
  list: withActiveTeam.input(listKeysSchema).query(async ({ ctx, input }) => {
    const result = await getTeamApiKeys(ctx.prisma, ctx.teamId, {
      type: input.type,
      activeOnly: input.activeOnly,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      keys: result.keys,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: result.total,
        hasMore: input.offset + result.keys.length < result.total,
      },
    };
  }),

  /**
   * List current user's API keys
   */
  myKeys: withActiveTeam
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await getUserApiKeys(
        ctx.prisma,
        ctx.teamId,
        ctx.session.user.id,
        {
          limit: input.limit,
          offset: input.offset,
        }
      );

      return {
        keys: result.keys,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.keys.length < result.total,
        },
      };
    }),

  /**
   * Get API key by ID
   */
  get: withActiveTeam
    .input(z.object({ keyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      return key;
    }),

  /**
   * Create API key
   * Returns the full key ONLY ONCE (not stored)
   */
  create: withActiveTeam
    .input(createKeySchema)
    .mutation(async ({ ctx, input }) => {
      // Generate the key
      const { key, prefix, hash } = generateApiKey(input.type);

      // Create in database
      const keyId = await createApiKey(ctx.prisma, {
        teamId: ctx.teamId,
        name: input.name,
        description: input.description,
        keyPrefix: prefix,
        keyHash: hash,
        type: input.type,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        allowedIps: input.allowedIps,
        allowedDomains: input.allowedDomains,
        rateLimit: input.rateLimit,
        createdBy: ctx.session.user.id,
      });

      // Return the full key (only time it's shown)
      return {
        id: keyId,
        key, // Full key - STORE THIS!
        prefix,
        name: input.name,
        type: input.type,
        scopes: input.scopes,
        expiresAt: input.expiresAt,
        message: "Store this key securely. It won't be shown again.",
      };
    }),

  /**
   * Update API key metadata
   */
  update: withActiveTeam
    .input(updateKeySchema)
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const { keyId, ...data } = input;

      const success = await updateApiKey(ctx.prisma, keyId, ctx.teamId, data);

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update API key",
        });
      }

      return { success: true };
    }),

  /**
   * Update API key scopes (Admin only)
   */
  updateScopes: withAdmin
    .input(updateScopesSchema)
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const success = await updateApiKeyScopes(
        ctx.prisma,
        input.keyId,
        ctx.teamId,
        input.scopes
      );

      return { success };
    }),

  /**
   * Update API key rate limits (Admin only)
   */
  updateRateLimit: withAdmin
    .input(
      z.object({
        keyId: z.string(),
        rateLimit: z.object({
          requestsPerMinute: z.number().min(1).optional(),
          requestsPerHour: z.number().min(1).optional(),
          requestsPerDay: z.number().min(1).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const success = await updateApiKeyRateLimit(
        ctx.prisma,
        input.keyId,
        ctx.teamId,
        input.rateLimit
      );

      return { success };
    }),

  /**
   * Revoke (deactivate) an API key
   */
  revoke: withActiveTeam
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Only allow users to revoke their own keys (unless admin)
      if (key.createdBy !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only revoke your own API keys",
        });
      }

      const success = await revokeApiKey(ctx.prisma, input.keyId, ctx.teamId);

      return { success };
    }),

  /**
   * Revoke any API key (Admin only)
   */
  adminRevoke: withAdmin
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const success = await revokeApiKey(ctx.prisma, input.keyId, ctx.teamId);

      return { success };
    }),

  /**
   * Reactivate an API key (Admin only)
   */
  reactivate: withAdmin
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const success = await reactivateApiKey(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      return { success };
    }),

  /**
   * Rotate an API key (create new, revoke old)
   */
  rotate: withActiveTeam
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      // Generate new key
      const { key: newKey, prefix, hash } = generateApiKey(key.type);

      const newKeyId = await rotateApiKey(
        ctx.prisma,
        input.keyId,
        ctx.teamId,
        prefix,
        hash
      );

      if (!newKeyId) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to rotate API key",
        });
      }

      return {
        id: newKeyId,
        key: newKey,
        prefix,
        oldKeyId: input.keyId,
        message: "Store this new key securely. The old key has been revoked.",
      };
    }),

  /**
   * Delete an API key permanently (Admin only)
   */
  delete: withAdmin
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyWithAccess(
        ctx.prisma,
        input.keyId,
        ctx.teamId
      );

      if (!key) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      const success = await deleteApiKey(ctx.prisma, input.keyId, ctx.teamId);

      return { success };
    }),
});
