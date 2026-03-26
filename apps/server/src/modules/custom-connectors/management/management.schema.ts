import { z } from "@hono/zod-openapi";

export const CreateDefinitionBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().url().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  defaultDocumentType: z.string().min(1).max(100).optional(),
  defaultIsPublic: z.boolean().optional(),
});

export const UpdateDefinitionBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  iconUrl: z.string().url().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  defaultDocumentType: z.string().min(1).max(100).optional(),
  defaultIsPublic: z.boolean().optional(),
});

export const CreateApiKeyBodySchema = z.object({
  name: z.string().min(1).max(200),
  scopes: z
    .array(z.enum(["push", "delete", "status"]))
    .min(1)
    .optional(),
  expiresAt: z.string().datetime().optional(),
});

export const DefinitionIdParamSchema = z.object({
  definitionId: z
    .string()
    .min(1)
    .openapi({ param: { name: "definitionId", in: "path" } }),
});

export const ApiKeyIdParamSchema = z.object({
  definitionId: z
    .string()
    .min(1)
    .openapi({ param: { name: "definitionId", in: "path" } }),
  keyId: z
    .string()
    .min(1)
    .openapi({ param: { name: "keyId", in: "path" } }),
});

export const DefinitionResponseSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  connectorId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  iconUrl: z.string().nullable(),
  fieldMappings: z.unknown(),
  defaultDocumentType: z.string(),
  defaultIsPublic: z.boolean(),
  totalDocuments: z.number(),
  totalPushes: z.number(),
  lastPushAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  prefix: z.string(),
  scopes: z.array(z.string()),
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  revoked: z.boolean(),
  createdAt: z.string(),
});

export const ApiKeyCreatedResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  prefix: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
