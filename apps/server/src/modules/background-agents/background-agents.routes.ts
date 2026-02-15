import { createRoute } from "@hono/zod-openapi";
import {
  agentIdParamsSchema,
  createAgentBodySchema,
  errorSchema,
  listAgentsQuerySchema,
  listLogsQuerySchema,
  successSchema,
  unknownResponseSchema,
} from "./background-agents.schema";

const tags = ["Background Agents"];

export const listBackgroundAgentsRoute = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List background agents",
  request: {
    query: listAgentsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Background agents listed",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
  },
});

export const createBackgroundAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create background agent",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createAgentBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Background agent created",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
  },
});

export const getBackgroundAgentRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}",
  summary: "Get background agent",
  request: {
    params: agentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Background agent fetched",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});

export const deleteBackgroundAgentRoute = createRoute({
  tags,
  method: "delete",
  path: "/{id}",
  summary: "Delete background agent",
  request: {
    params: agentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Background agent deleted",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});

export const pauseBackgroundAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/pause",
  summary: "Pause background agent",
  request: {
    params: agentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Background agent paused",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});

export const resumeBackgroundAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/resume",
  summary: "Resume background agent",
  request: {
    params: agentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Background agent resumed",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});

export const cancelBackgroundAgentRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/cancel",
  summary: "Cancel background agent",
  request: {
    params: agentIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Background agent cancelled",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});

export const getBackgroundAgentLogsRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}/logs",
  summary: "Get background agent logs",
  request: {
    params: agentIdParamsSchema,
    query: listLogsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Background agent logs fetched",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Background agent not found",
    },
  },
});
