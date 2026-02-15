import { createRoute } from "@hono/zod-openapi";
import {
  connectorIdParamsSchema,
  createConnectorBodySchema,
  errorSchema,
  listConnectorResourcesQuerySchema,
  resourceIdParamsSchema,
  unknownResponseSchema,
  updateConnectorBodySchema,
  updateConnectorResourceBodySchema,
} from "./apps.schema";

const tags = ["Apps", "Connectors"];

export const listConnectorsRoute = createRoute({
  tags,
  method: "get",
  path: "/connectors",
  summary: "List connectors",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Connectors listed successfully",
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

export const getConnectorRoute = createRoute({
  tags,
  method: "get",
  path: "/connectors/{id}",
  summary: "Get connector",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Connector fetched successfully",
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
      description: "Connector not found",
    },
  },
});

export const createConnectorRoute = createRoute({
  tags,
  method: "post",
  path: "/connectors",
  summary: "Create or connect connector",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createConnectorBodySchema,
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
      description: "Connector created or updated",
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

export const updateConnectorRoute = createRoute({
  tags,
  method: "patch",
  path: "/connectors/{id}",
  summary: "Update connector settings",
  request: {
    params: connectorIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateConnectorBodySchema,
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
      description: "Connector updated",
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
      description: "Connector not found",
    },
  },
});

export const deleteConnectorRoute = createRoute({
  tags,
  method: "delete",
  path: "/connectors/{id}",
  summary: "Disconnect connector",
  request: {
    params: connectorIdParamsSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Connector disconnected",
    },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad Request",
    },
    403: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Forbidden",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Connector not found",
    },
  },
});

export const listConnectorResourcesRoute = createRoute({
  tags,
  method: "get",
  path: "/connectors/{id}/resources",
  summary: "List connector resources",
  request: {
    params: connectorIdParamsSchema,
    query: listConnectorResourcesQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: unknownResponseSchema,
        },
      },
      description: "Resources listed",
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
      description: "Connector not found",
    },
  },
});

export const updateConnectorResourceRoute = createRoute({
  tags,
  method: "patch",
  path: "/connectors/resources/{resourceId}",
  summary: "Update connector resource sync settings",
  request: {
    params: resourceIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: updateConnectorResourceBodySchema,
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
      description: "Resource updated",
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
      description: "Resource not found",
    },
  },
});
