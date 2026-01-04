import { createRoute } from "@hono/zod-openapi";
import {
  errorSchema,
  promptArgsQuerySchema,
  promptGetResponseSchema,
  promptNameParamsSchema,
  promptsListResponseSchema,
  resourceReadResponseSchema,
  resourcesListResponseSchema,
  resourceUriParamsSchema,
  toolCallParamsSchema,
  toolCallResponseSchema,
  toolNameParamsSchema,
  toolsListResponseSchema,
} from "./mcp.schema";

const tags = ["MCP"];

export const listTools = createRoute({
  tags,
  method: "get",
  path: "/tools",
  summary: "List available tools",
  description: "List all tools available for the authenticated team",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: toolsListResponseSchema,
        },
      },
      description: "Tools retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

export const callTool = createRoute({
  tags,
  method: "post",
  path: "/tools/{name}/call",
  summary: "Call a tool",
  description: "Execute a tool with the provided arguments",
  request: {
    params: toolNameParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: toolCallParamsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: toolCallResponseSchema,
        },
      },
      description: "Tool executed successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid parameters",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Tool not found",
    },
  },
});

export const listResources = createRoute({
  tags,
  method: "get",
  path: "/resources",
  summary: "List available resources",
  description: "List all resources available for the authenticated team",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: resourcesListResponseSchema,
        },
      },
      description: "Resources retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

export const readResource = createRoute({
  tags,
  method: "get",
  path: "/resources/{uri}",
  summary: "Read a resource",
  description: "Read the contents of a resource by URI",
  request: {
    params: resourceUriParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: resourceReadResponseSchema,
        },
      },
      description: "Resource retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Resource not found",
    },
  },
});

export const listPrompts = createRoute({
  tags,
  method: "get",
  path: "/prompts",
  summary: "List available prompts",
  description: "List all prompt templates available for the authenticated team",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: promptsListResponseSchema,
        },
      },
      description: "Prompts retrieved successfully",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

export const getPrompt = createRoute({
  tags,
  method: "get",
  path: "/prompts/{name}",
  summary: "Get a prompt",
  description: "Get a prompt template with optional arguments",
  request: {
    params: promptNameParamsSchema,
    query: promptArgsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: promptGetResponseSchema,
        },
      },
      description: "Prompt retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Invalid arguments",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Prompt not found",
    },
  },
});
