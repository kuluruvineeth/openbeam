import { createRoute } from "@hono/zod-openapi";
import {
  artifactsResponseSchema,
  cancelResponseSchema,
  errorSchema,
  progressResponseSchema,
  startResearchBodySchema,
  startResearchResponseSchema,
  workflowIdParamsSchema,
} from "./research.schema";

const tags = ["Research"];

export const startResearchRoute = createRoute({
  tags,
  method: "post",
  path: "/start",
  summary: "Start research workflow",
  request: {
    body: {
      content: {
        "application/json": {
          schema: startResearchBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: startResearchResponseSchema,
        },
      },
      description: "Research workflow started",
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

export const getResearchProgressRoute = createRoute({
  tags,
  method: "get",
  path: "/{workflowId}/progress",
  summary: "Get research workflow progress",
  request: {
    params: workflowIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: progressResponseSchema,
        },
      },
      description: "Research progress fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Research workflow not found",
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

export const getResearchArtifactsRoute = createRoute({
  tags,
  method: "get",
  path: "/{workflowId}/artifacts",
  summary: "Get research workflow artifacts",
  request: {
    params: workflowIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: artifactsResponseSchema,
        },
      },
      description: "Research artifacts fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Research workflow not found",
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

export const cancelResearchRoute = createRoute({
  tags,
  method: "post",
  path: "/{workflowId}/cancel",
  summary: "Cancel research workflow",
  request: {
    params: workflowIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: cancelResponseSchema,
        },
      },
      description: "Research workflow cancelled",
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
      description: "Research workflow not found",
    },
  },
});
