import { createRoute } from "@hono/zod-openapi";
import {
  publicDatasetsResponseSchema,
  publicDocumentParamSchema,
  publicDocumentResponseSchema,
  publicOverviewQuerySchema,
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

export const publicOverviewRoute = createRoute({
  tags,
  method: "get",
  path: "/overview",
  summary: "AI overview for public search query",
  description:
    "Streams an AI-synthesized answer with citations via Server-Sent Events. Rate limited to 3 req/min per IP.",
  request: {
    query: publicOverviewQuerySchema,
  },
  responses: {
    200: {
      description: "SSE stream of overview chunks",
    },
    429: {
      content: { "application/json": { schema: publicSearchErrorSchema } },
      description: "Rate limited",
    },
  },
});

export const publicDocumentRoute = createRoute({
  tags,
  method: "get",
  path: "/documents/{id}",
  summary: "Get public document by ID",
  description:
    "Retrieve full content of a public document. Scoped to public team only.",
  request: {
    params: publicDocumentParamSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: publicDocumentResponseSchema },
      },
      description: "Document content",
    },
    404: {
      content: { "application/json": { schema: publicSearchErrorSchema } },
      description: "Document not found",
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
