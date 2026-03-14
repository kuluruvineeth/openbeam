import { createRoute } from "@hono/zod-openapi";
import {
  publicDatasetsResponseSchema,
  publicSearchErrorSchema,
  publicSearchQuerySchema,
  publicSearchResponseSchema,
} from "./public-search.schema";

const tags = ["Public Search"];

export const publicSearchRoute = createRoute({
  tags,
  method: "get",
  path: "/search",
  summary: "Search public datasets",
  description:
    "Search across public security datasets (NVD, CISA KEV, MITRE ATT&CK, OWASP). No authentication required. Rate limited to 30 req/min per IP.",
  request: {
    query: publicSearchQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: publicSearchResponseSchema } },
      description: "Search results",
    },
    400: {
      content: { "application/json": { schema: publicSearchErrorSchema } },
      description: "Invalid query",
    },
    429: {
      content: { "application/json": { schema: publicSearchErrorSchema } },
      description: "Rate limited",
    },
  },
});

export const publicDatasetsRoute = createRoute({
  tags,
  method: "get",
  path: "/datasets",
  summary: "List available public datasets",
  description: "Returns metadata about all available public datasets.",
  responses: {
    200: {
      content: { "application/json": { schema: publicDatasetsResponseSchema } },
      description: "Dataset listing",
    },
  },
});
