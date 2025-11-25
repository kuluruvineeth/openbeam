/**
 * API Keys Management Routes
 * OpenAPI route definitions for API key operations
 */

import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import {
  apiKeyIdParamsSchema,
  apiKeyResponseSchema,
  apiKeyUsageResponseSchema,
  createApiKeyBodySchema,
  createApiKeyResponseSchema,
  deleteResponseSchema,
  errorSchema,
  listApiKeysQuerySchema,
  listApiKeysResponseSchema,
  revokeApiKeyBodySchema,
  updateApiKeyBodySchema,
} from "./api-keys.schema";

const tags = ["API Keys"];

// ============================================================================
// API Key Routes
// ============================================================================

export const listApiKeys = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List API keys",
  description: "Retrieve a list of API keys for the team",
  request: {
    query: listApiKeysQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: listApiKeysResponseSchema } },
      description: "API keys retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Forbidden - insufficient permissions",
    },
  },
});

export const createApiKey = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create API key",
  description: `
Create a new API key. The full key is only returned once upon creation.
Store it securely as it cannot be retrieved later.

**Key Types:**
- \`standard\`: Regular API access
- \`restricted\`: Limited permissions
- \`admin\`: Full admin access
- \`service\`: Service-to-service communication
- \`webhook\`: Webhook verification
- \`embed\`: Embedded widget access
`,
  request: {
    body: {
      content: {
        "application/json": {
          schema: createApiKeyBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: createApiKeyResponseSchema } },
      description: "API key created successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    403: {
      content: { "application/json": { schema: errorSchema } },
      description: "Forbidden - insufficient permissions",
    },
  },
});

export const getApiKey = createRoute({
  tags,
  method: "get",
  path: "/{keyId}",
  summary: "Get API key details",
  description: "Retrieve details about a specific API key (without the secret)",
  request: {
    params: apiKeyIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: apiKeyResponseSchema } },
      description: "API key details retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});

export const updateApiKey = createRoute({
  tags,
  method: "patch",
  path: "/{keyId}",
  summary: "Update API key",
  description: "Update an API key's properties (not the secret)",
  request: {
    params: apiKeyIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateApiKeyBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: apiKeyResponseSchema } },
      description: "API key updated successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});

export const revokeApiKey = createRoute({
  tags,
  method: "post",
  path: "/{keyId}/revoke",
  summary: "Revoke API key",
  description: "Revoke an API key, making it permanently unusable",
  request: {
    params: apiKeyIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: revokeApiKeyBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "API key revoked successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});

export const deleteApiKey = createRoute({
  tags,
  method: "delete",
  path: "/{keyId}",
  summary: "Delete API key",
  description: "Permanently delete an API key",
  request: {
    params: apiKeyIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: deleteResponseSchema } },
      description: "API key deleted successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});

export const getApiKeyUsage = createRoute({
  tags,
  method: "get",
  path: "/{keyId}/usage",
  summary: "Get API key usage",
  description: "Retrieve usage statistics for an API key",
  request: {
    params: apiKeyIdParamsSchema,
    query: z.object({
      period: z.enum(["1h", "24h", "7d", "30d"]).default("24h").openapi({
        description: "Time period for usage statistics",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: apiKeyUsageResponseSchema } },
      description: "Usage statistics retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});

export const rotateApiKey = createRoute({
  tags,
  method: "post",
  path: "/{keyId}/rotate",
  summary: "Rotate API key",
  description: "Generate a new secret for an API key (old key becomes invalid)",
  request: {
    params: apiKeyIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: createApiKeyResponseSchema } },
      description: "API key rotated successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "API key not found",
    },
  },
});
