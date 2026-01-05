import { createRoute } from "@hono/zod-openapi";
import {
  costBreakdownQuerySchema,
  costBreakdownResponseSchema,
  errorSchema,
  spreadsheetListRequestSchema,
  spreadsheetListResponseSchema,
  spreadsheetQueryRequestSchema,
  spreadsheetQueryResponseSchema,
  spreadsheetSchemaRequestSchema,
  spreadsheetSchemaResponseSchema,
  spreadsheetSqlRequestSchema,
  spreadsheetSqlResponseSchema,
  topCostDriversQuerySchema,
  topCostDriversResponseSchema,
  usageTrendQuerySchema,
  usageTrendResponseSchema,
} from "./analytics.schema";

const tags = ["Analytics"];
const spreadsheetTags = ["Spreadsheets"];

export const costBreakdownRoute = createRoute({
  tags,
  method: "get",
  path: "/cost-breakdown",
  summary: "Get cost breakdown",
  description:
    "Analyze AI usage costs grouped by various dimensions (provider, model, workflow, user, date)",
  request: {
    query: costBreakdownQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: costBreakdownResponseSchema,
        },
      },
      description: "Cost breakdown retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const usageTrendRoute = createRoute({
  tags,
  method: "get",
  path: "/usage-trend",
  summary: "Get usage trend",
  description:
    "Get AI usage trends over time with configurable granularity (hour, day, week)",
  request: {
    query: usageTrendQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: usageTrendResponseSchema,
        },
      },
      description: "Usage trend retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const topCostDriversRoute = createRoute({
  tags,
  method: "get",
  path: "/top-cost-drivers",
  summary: "Get top cost drivers",
  description:
    "Identify the highest cost contributors by model, workflow, or user",
  request: {
    query: topCostDriversQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: topCostDriversResponseSchema,
        },
      },
      description: "Top cost drivers retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const listSpreadsheetsRoute = createRoute({
  tags: spreadsheetTags,
  method: "get",
  path: "/spreadsheets",
  summary: "List spreadsheets",
  description: "List all indexed spreadsheets available for querying",
  request: {
    query: spreadsheetListRequestSchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: spreadsheetListResponseSchema,
        },
      },
      description: "Spreadsheets listed successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
  },
});

export const getSpreadsheetSchemaRoute = createRoute({
  tags: spreadsheetTags,
  method: "get",
  path: "/spreadsheets/:documentId/schema",
  summary: "Get spreadsheet schema",
  description:
    "Get the schema (columns, types, sample data) of a spreadsheet document",
  request: {
    query: spreadsheetSchemaRequestSchema.omit({ document_id: true }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: spreadsheetSchemaResponseSchema,
        },
      },
      description: "Schema retrieved successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Spreadsheet not found",
    },
  },
});

export const generateSpreadsheetSqlRoute = createRoute({
  tags: spreadsheetTags,
  method: "post",
  path: "/spreadsheets/:documentId/generate-sql",
  summary: "Generate SQL from natural language",
  description:
    "Convert a natural language question into a DuckDB SQL query for spreadsheet data",
  request: {
    body: {
      content: {
        "application/json": {
          schema: spreadsheetSqlRequestSchema.omit({ document_id: true }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: spreadsheetSqlResponseSchema,
        },
      },
      description: "SQL generated successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Spreadsheet not found",
    },
  },
});

export const executeSpreadsheetQueryRoute = createRoute({
  tags: spreadsheetTags,
  method: "post",
  path: "/spreadsheets/:documentId/query",
  summary: "Execute SQL query",
  description: "Execute a SQL query against spreadsheet data using DuckDB",
  request: {
    body: {
      content: {
        "application/json": {
          schema: spreadsheetQueryRequestSchema.omit({ document_id: true }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: spreadsheetQueryResponseSchema,
        },
      },
      description: "Query executed successfully",
    },
    400: {
      content: { "application/json": { schema: errorSchema } },
      description: "Bad Request",
    },
    404: {
      content: { "application/json": { schema: errorSchema } },
      description: "Spreadsheet not found",
    },
  },
});
