import { createRoute } from "@hono/zod-openapi";
import {
  canvasIdParamsSchema,
  createCanvasBodySchema,
  createExecutionBodySchema,
  errorSchema,
  listCanvasQuerySchema,
  listExecutionsQuerySchema,
  publishCanvasBodySchema,
  successSchema,
  unknownResponseSchema,
  updateCanvasBodySchema,
} from "./canvas.schema";

const tags = ["Canvas"];

export const listCanvasRoute = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List canvases",
  request: {
    query: listCanvasQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Canvases listed",
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

export const createCanvasRoute = createRoute({
  tags,
  method: "post",
  path: "/",
  summary: "Create canvas",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createCanvasBodySchema,
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
      description: "Canvas created",
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

export const getCanvasRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}",
  summary: "Get canvas",
  request: {
    params: canvasIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Canvas fetched",
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
      description: "Canvas not found",
    },
  },
});

export const updateCanvasRoute = createRoute({
  tags,
  method: "patch",
  path: "/{id}",
  summary: "Update canvas",
  request: {
    params: canvasIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateCanvasBodySchema,
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
      description: "Canvas updated",
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
      description: "Canvas not found",
    },
  },
});

export const deleteCanvasRoute = createRoute({
  tags,
  method: "delete",
  path: "/{id}",
  summary: "Delete canvas",
  request: {
    params: canvasIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: successSchema,
        },
      },
      description: "Canvas deleted",
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
      description: "Canvas not found",
    },
  },
});

export const publishCanvasRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/publish",
  summary: "Publish canvas",
  request: {
    params: canvasIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: publishCanvasBodySchema,
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
      description: "Canvas published",
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
      description: "Canvas not found",
    },
  },
});

export const listCanvasExecutionsRoute = createRoute({
  tags,
  method: "get",
  path: "/{id}/executions",
  summary: "List canvas executions",
  request: {
    params: canvasIdParamsSchema,
    query: listExecutionsQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Canvas executions listed",
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
      description: "Canvas not found",
    },
  },
});

export const createCanvasExecutionRoute = createRoute({
  tags,
  method: "post",
  path: "/{id}/executions",
  summary: "Create canvas execution",
  request: {
    params: canvasIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: createExecutionBodySchema,
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
      description: "Canvas execution created",
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
      description: "Canvas not found",
    },
    500: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Server Error",
    },
  },
});
