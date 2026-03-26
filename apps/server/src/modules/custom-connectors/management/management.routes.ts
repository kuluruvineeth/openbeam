import { createRoute, z } from "@hono/zod-openapi";
import {
  ApiKeyCreatedResponseSchema,
  ApiKeyIdParamSchema,
  ApiKeyResponseSchema,
  CreateApiKeyBodySchema,
  CreateDefinitionBodySchema,
  DefinitionIdParamSchema,
  DefinitionResponseSchema,
  ErrorResponseSchema,
  UpdateDefinitionBodySchema,
} from "./management.schema";

export const createDefinitionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Custom Connectors - Management"],
  summary: "Create a custom connector definition",
  request: {
    body: {
      content: { "application/json": { schema: CreateDefinitionBodySchema } },
    },
  },
  responses: {
    201: {
      description: "Definition created",
      content: { "application/json": { schema: DefinitionResponseSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    409: {
      description: "Slug already exists",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const listDefinitionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Custom Connectors - Management"],
  summary: "List custom connector definitions",
  responses: {
    200: {
      description: "Definitions list",
      content: {
        "application/json": {
          schema: DefinitionResponseSchema.array(),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const getDefinitionRoute = createRoute({
  method: "get",
  path: "/{definitionId}",
  tags: ["Custom Connectors - Management"],
  summary: "Get a custom connector definition",
  request: {
    params: DefinitionIdParamSchema,
  },
  responses: {
    200: {
      description: "Definition details",
      content: { "application/json": { schema: DefinitionResponseSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const updateDefinitionRoute = createRoute({
  method: "patch",
  path: "/{definitionId}",
  tags: ["Custom Connectors - Management"],
  summary: "Update a custom connector definition",
  request: {
    params: DefinitionIdParamSchema,
    body: {
      content: { "application/json": { schema: UpdateDefinitionBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Definition updated",
      content: { "application/json": { schema: DefinitionResponseSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const deleteDefinitionRoute = createRoute({
  method: "delete",
  path: "/{definitionId}",
  tags: ["Custom Connectors - Management"],
  summary: "Delete a custom connector definition",
  request: {
    params: DefinitionIdParamSchema,
  },
  responses: {
    200: {
      description: "Definition deleted",
      content: {
        "application/json": {
          schema: DefinitionResponseSchema.pick({
            id: true,
          }).extend({ deleted: z.boolean() }),
        },
      },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const createApiKeyRoute = createRoute({
  method: "post",
  path: "/{definitionId}/keys",
  tags: ["Custom Connectors - Management"],
  summary: "Generate an API key for a custom connector",
  request: {
    params: DefinitionIdParamSchema,
    body: {
      content: { "application/json": { schema: CreateApiKeyBodySchema } },
    },
  },
  responses: {
    201: {
      description: "API key created (key shown only once)",
      content: { "application/json": { schema: ApiKeyCreatedResponseSchema } },
    },
    404: {
      description: "Definition not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const listApiKeysRoute = createRoute({
  method: "get",
  path: "/{definitionId}/keys",
  tags: ["Custom Connectors - Management"],
  summary: "List API keys for a custom connector",
  request: {
    params: DefinitionIdParamSchema,
  },
  responses: {
    200: {
      description: "API keys list",
      content: {
        "application/json": { schema: ApiKeyResponseSchema.array() },
      },
    },
    404: {
      description: "Definition not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

export const revokeApiKeyRoute = createRoute({
  method: "delete",
  path: "/{definitionId}/keys/{keyId}",
  tags: ["Custom Connectors - Management"],
  summary: "Revoke an API key",
  request: {
    params: ApiKeyIdParamSchema,
  },
  responses: {
    200: {
      description: "API key revoked",
      content: {
        "application/json": {
          schema: ApiKeyResponseSchema.pick({ id: true }).extend({
            revoked: z.boolean(),
          }),
        },
      },
    },
    404: {
      description: "Key not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});
