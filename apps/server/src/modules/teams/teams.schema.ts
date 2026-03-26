import { z } from "@hono/zod-openapi";

export const teamIdParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
});

export const teamApiKeyParamsSchema = z.object({
  id: z.string().openapi({
    param: {
      name: "id",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0000",
  }),
  keyId: z.string().openapi({
    param: {
      name: "keyId",
      in: "path",
    },
    example: "cm3t5x8u00000j10y2x8u0001",
  }),
});

const teamRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  role: teamRoleSchema,
});

export const listTeamsResponseSchema = z.object({
  teams: z.array(teamSchema),
});

export const createTeamBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const createTeamResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const switchTeamResponseSchema = z.object({
  success: z.boolean(),
});

export const teamRoleResponseSchema = z.object({
  role: teamRoleSchema.nullable(),
});

export const createTeamApiKeyBodySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string().min(1)).max(64).optional(),
  expiresAt: z.iso.datetime().optional(),
});

export const teamApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  revoked: z.boolean(),
  createdAt: z.iso.datetime(),
});

export const listTeamApiKeysResponseSchema = z.object({
  apiKeys: z.array(teamApiKeySchema),
});

export const createTeamApiKeyResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  prefix: z.string(),
  createdAt: z.iso.datetime(),
});

export const revokeTeamApiKeyResponseSchema = z.object({
  success: z.boolean(),
});

export const errorSchema = z.object({
  error: z.string(),
});
