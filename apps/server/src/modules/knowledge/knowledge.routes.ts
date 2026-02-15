import { createRoute } from "@hono/zod-openapi";
import {
  entityIdParamsSchema,
  errorSchema,
  limitQuerySchema,
  listEntitiesQuerySchema,
  relationsQuerySchema,
  searchEntitiesQuerySchema,
} from "./knowledge.schema";

const tags = ["Knowledge"];

export const listEntitiesRoute = createRoute({
  tags,
  method: "get",
  path: "/entities",
  summary: "List entities",
  request: {
    query: listEntitiesQuerySchema,
  },
  responses: {
    200: {
      description: "Entities listed",
    },
  },
});

export const searchEntitiesRoute = createRoute({
  tags,
  method: "get",
  path: "/entities/search",
  summary: "Search entities",
  request: {
    query: searchEntitiesQuerySchema,
  },
  responses: {
    200: {
      description: "Entities found",
    },
  },
});

export const getEntityRoute = createRoute({
  tags,
  method: "get",
  path: "/entities/{id}",
  summary: "Get entity",
  request: {
    params: entityIdParamsSchema,
  },
  responses: {
    200: {
      description: "Entity fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Entity not found",
    },
  },
});

export const getRelationsRoute = createRoute({
  tags,
  method: "get",
  path: "/entities/{id}/relations",
  summary: "Get entity relations",
  request: {
    params: entityIdParamsSchema,
    query: relationsQuerySchema,
  },
  responses: {
    200: {
      description: "Relations fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Entity not found",
    },
  },
});

export const getKnowledgePanelRoute = createRoute({
  tags,
  method: "get",
  path: "/entities/{id}/panel",
  summary: "Get knowledge panel",
  request: {
    params: entityIdParamsSchema,
  },
  responses: {
    200: {
      description: "Knowledge panel fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Entity not found",
    },
  },
});

export const getExpertsRoute = createRoute({
  tags,
  method: "get",
  path: "/topics/{id}/experts",
  summary: "Get experts for topic",
  request: {
    params: entityIdParamsSchema,
    query: limitQuerySchema,
  },
  responses: {
    200: {
      description: "Experts fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Topic not found",
    },
  },
});

export const getExpertiseRoute = createRoute({
  tags,
  method: "get",
  path: "/people/{id}/expertise",
  summary: "Get expertise for person",
  request: {
    params: entityIdParamsSchema,
    query: limitQuerySchema,
  },
  responses: {
    200: {
      description: "Expertise fetched",
    },
    404: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Person not found",
    },
  },
});
