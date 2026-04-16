import { createRoute } from "@hono/zod-openapi";
import {
  agentIdParamsSchema,
  agentListResponseSchema,
  agentResponseSchema,
  approveBodySchema,
  approveResponseSchema,
  catalogResponseSchema,
  confirmBodySchema,
  enableAgentBodySchema,
  errorSchema,
  generateBodySchema,
  generateResponseSchema,
  memoryListResponseSchema,
  rejectResponseSchema,
  runIdParamsSchema,
  runListResponseSchema,
  triggerRunResponseSchema,
} from "./computer.schema";

const tags = ["Computer"];

export const getCatalogRoute = createRoute({
  tags,
  method: "get",
  path: "/catalog",
  summary: "List pre-built agent catalog",
  responses: {
    200: {
      content: { "application/json": { schema: catalogResponseSchema } },
      description: "Catalog agents",
    },
  },
});

export const listAgentsRoute = createRoute({
  tags,
  method: "get",
  path: "/agents",
  summary: "List team agents",
  responses: {
    200: {
      content: { "application/json": { schema: agentListResponseSchema } },
      description: "Team agents",
    },
  },
});

export const enableAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/agents",
  summary: "Enable a catalog agent",
  request: {
    body: {
      content: { "application/json": { schema: enableAgentBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: agentResponseSchema } },
      description: "Agent enabled",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Template not found",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Agent already enabled",
    },
  },
});

export const deleteAgentRoute = createRoute({
  tags,
  method: "delete",
  path: "/agents/{agentId}",
  summary: "Delete an agent",
  request: { params: agentIdParamsSchema },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: rejectResponseSchema,
        },
      },
      description: "Agent deleted",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Agent not found",
    },
  },
});

export const triggerRunRoute = createRoute({
  tags,
  method: "post",
  path: "/agents/{agentId}/run",
  summary: "Trigger agent run",
  request: { params: agentIdParamsSchema },
  responses: {
    202: {
      content: { "application/json": { schema: triggerRunResponseSchema } },
      description: "Run triggered",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Agent not found",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Agent not active",
    },
  },
});

export const listRunsRoute = createRoute({
  tags,
  method: "get",
  path: "/agents/{agentId}/runs",
  summary: "List agent runs",
  request: { params: agentIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: runListResponseSchema } },
      description: "Agent runs",
    },
  },
});

export const approveRunRoute = createRoute({
  tags,
  method: "post",
  path: "/agents/{agentId}/runs/{runId}/approve",
  summary: "Approve proposed actions",
  request: {
    params: runIdParamsSchema,
    body: {
      content: { "application/json": { schema: approveBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: approveResponseSchema } },
      description: "Actions approved",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "No pending proposals",
    },
  },
});

export const rejectRunRoute = createRoute({
  tags,
  method: "post",
  path: "/agents/{agentId}/runs/{runId}/reject",
  summary: "Reject proposed actions",
  request: { params: runIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: rejectResponseSchema } },
      description: "Run rejected",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "No pending proposals",
    },
  },
});

export const listMemoryRoute = createRoute({
  tags,
  method: "get",
  path: "/agents/{agentId}/memory",
  summary: "List agent memory entries",
  request: { params: agentIdParamsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: memoryListResponseSchema } },
      description: "Agent memory",
    },
  },
});

export const generateAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/generate",
  summary: "Generate agent from description",
  request: {
    body: {
      content: { "application/json": { schema: generateBodySchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: generateResponseSchema } },
      description: "Agent generated",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Generation failed",
    },
  },
});

export const confirmAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/agents/confirm",
  summary: "Deploy generated agent",
  request: {
    body: {
      content: { "application/json": { schema: confirmBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: agentResponseSchema } },
      description: "Agent deployed",
    },
    409: {
      content: { "application/json": { schema: errorSchema } },
      description: "Slug already exists",
    },
  },
});
