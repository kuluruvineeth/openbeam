/**
 * People/Directory API Routes
 * OpenAPI route definitions for people/directory operations
 */

import { createRoute } from "@hono/zod-openapi";
import {
  errorSchema,
  getPersonResponseSchema,
  listPeopleQuerySchema,
  listPeopleResponseSchema,
  orgChartQuerySchema,
  orgChartResponseSchema,
  personActivityResponseSchema,
  personDocumentsResponseSchema,
  personIdParamsSchema,
  searchPeopleQuerySchema,
  searchPeopleResponseSchema,
} from "./people.schema";

const tags = ["People"];

// ============================================================================
// List People
// ============================================================================

export const listPeople = createRoute({
  tags,
  method: "get",
  path: "/",
  summary: "List people",
  description:
    "Retrieve a paginated list of people in the organization directory",
  request: {
    query: listPeopleQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: listPeopleResponseSchema } },
      description: "People retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    401: {
      content: { "application/json": { schema: errorSchema } },
      description: "Unauthorized",
    },
  },
});

// ============================================================================
// Search People
// ============================================================================

export const searchPeople = createRoute({
  tags,
  method: "get",
  path: "/search",
  summary: "Search people",
  description: "Search for people by name, email, title, or skills",
  request: {
    query: searchPeopleQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: searchPeopleResponseSchema } },
      description: "Search results retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

// ============================================================================
// Get Person
// ============================================================================

export const getPerson = createRoute({
  tags,
  method: "get",
  path: "/{personId}",
  summary: "Get person details",
  description: "Retrieve detailed information about a specific person",
  request: {
    params: personIdParamsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: getPersonResponseSchema } },
      description: "Person retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Person not found",
    },
  },
});

// ============================================================================
// Get Person Org Chart
// ============================================================================

export const getPersonOrgChart = createRoute({
  tags,
  method: "get",
  path: "/{personId}/org-chart",
  summary: "Get person's org chart",
  description: "Retrieve the organizational chart around a specific person",
  request: {
    params: personIdParamsSchema,
    query: orgChartQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: orgChartResponseSchema } },
      description: "Org chart retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Person not found",
    },
  },
});

// ============================================================================
// Get Person Documents
// ============================================================================

export const getPersonDocuments = createRoute({
  tags,
  method: "get",
  path: "/{personId}/documents",
  summary: "Get person's documents",
  description: "Retrieve documents created or owned by a specific person",
  request: {
    params: personIdParamsSchema,
    query: listPeopleQuerySchema.pick({ limit: true, offset: true }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: personDocumentsResponseSchema },
      },
      description: "Documents retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Person not found",
    },
  },
});

// ============================================================================
// Get Person Activity
// ============================================================================

export const getPersonActivity = createRoute({
  tags,
  method: "get",
  path: "/{personId}/activity",
  summary: "Get person's activity",
  description: "Retrieve activity metrics and history for a specific person",
  request: {
    params: personIdParamsSchema,
    query: z.object({
      period: z.enum(["7d", "30d", "90d", "1y"]).default("30d").openapi({
        description: "Time period for activity",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: personActivityResponseSchema } },
      description: "Activity retrieved successfully",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Person not found",
    },
  },
});

import { z } from "zod";
