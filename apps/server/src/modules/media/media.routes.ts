import { createRoute } from "@hono/zod-openapi";
import {
  askBodySchema,
  errorSchema,
  forceRefreshQuerySchema,
  mediaIdParamsSchema,
  regenerateBodySchema,
  vespaIdParamsSchema,
} from "./media.schema";

const tags = ["Media"];

export const getChaptersRoute = createRoute({
  tags,
  method: "get",
  path: "/{vespaId}/chapters",
  summary: "Get media chapters",
  request: {
    params: vespaIdParamsSchema,
    query: forceRefreshQuerySchema,
  },
  responses: {
    200: { description: "Chapters fetched" },
  },
});

export const getHighlightsRoute = createRoute({
  tags,
  method: "get",
  path: "/{vespaId}/highlights",
  summary: "Get media highlights",
  request: {
    params: vespaIdParamsSchema,
    query: forceRefreshQuerySchema,
  },
  responses: {
    200: { description: "Highlights fetched" },
  },
});

export const getTranscriptRoute = createRoute({
  tags,
  method: "get",
  path: "/{vespaId}/transcript",
  summary: "Get media transcript",
  request: {
    params: vespaIdParamsSchema,
    query: forceRefreshQuerySchema,
  },
  responses: {
    200: { description: "Transcript fetched" },
  },
});

export const getSummaryRoute = createRoute({
  tags,
  method: "get",
  path: "/{vespaId}/summary",
  summary: "Get media summary",
  request: {
    params: vespaIdParamsSchema,
    query: forceRefreshQuerySchema,
  },
  responses: {
    200: { description: "Summary fetched" },
  },
});

export const getMetadataRoute = createRoute({
  tags,
  method: "get",
  path: "/{vespaId}/metadata",
  summary: "Get media metadata",
  request: {
    params: vespaIdParamsSchema,
  },
  responses: {
    200: { description: "Metadata fetched" },
  },
});

export const regenerateRoute = createRoute({
  tags,
  method: "post",
  path: "/{vespaId}/regenerate",
  summary: "Regenerate media derived content",
  request: {
    params: vespaIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: regenerateBodySchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Content regenerated" },
  },
});

export const askRoute = createRoute({
  tags,
  method: "post",
  path: "/{mediaId}/ask",
  summary: "Ask question about media",
  request: {
    params: mediaIdParamsSchema,
    body: {
      content: {
        "application/json": {
          schema: askBodySchema,
        },
      },
    },
  },
  responses: {
    200: { description: "Question answered" },
    400: {
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
      description: "Bad request",
    },
  },
});
