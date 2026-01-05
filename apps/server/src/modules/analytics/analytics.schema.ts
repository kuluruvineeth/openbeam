import { z } from "zod";

export const errorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export const costBreakdownQuerySchema = z.object({
  start_date: z.coerce.date().openapi({
    description: "Start date for the analysis period",
    example: "2024-01-01",
  }),
  end_date: z.coerce.date().openapi({
    description: "End date for the analysis period",
    example: "2024-01-31",
  }),
  group_by: z
    .string()
    .optional()
    .transform(
      (val) =>
        val
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean) as
          | ("provider" | "model" | "workflow" | "user" | "date")[]
          | undefined
    )
    .openapi({
      description:
        "Comma-separated list of dimensions to group by (provider, model, workflow, user, date)",
      example: "date,model",
    }),
});

export const costBreakdownResultSchema = z.object({
  dimensions: z.record(z.string(), z.string().nullable()),
  cost: z.number(),
  requests: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  avgLatencyMs: z.number(),
});

export const costBreakdownResponseSchema = z.object({
  results: z.array(costBreakdownResultSchema),
  totalCost: z.number(),
  totalRequests: z.number(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  dataSource: z.enum(["parquet", "empty"]),
});

export const usageTrendQuerySchema = z.object({
  start_date: z.coerce.date().openapi({
    description: "Start date for the trend analysis",
    example: "2024-01-01",
  }),
  end_date: z.coerce.date().openapi({
    description: "End date for the trend analysis",
    example: "2024-01-31",
  }),
  granularity: z.enum(["hour", "day", "week"]).default("day").openapi({
    description: "Time granularity for the trend",
    example: "day",
  }),
});

export const usageTrendPointSchema = z.object({
  timestamp: z.string(),
  cost: z.number(),
  requests: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
});

export const usageTrendResponseSchema = z.object({
  points: z.array(usageTrendPointSchema),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  granularity: z.string(),
});

export const topCostDriversQuerySchema = z.object({
  start_date: z.coerce.date().openapi({
    description: "Start date for the analysis",
    example: "2024-01-01",
  }),
  end_date: z.coerce.date().openapi({
    description: "End date for the analysis",
    example: "2024-01-31",
  }),
  dimension: z.enum(["model", "workflow", "user"]).openapi({
    description: "Dimension to analyze",
    example: "model",
  }),
  limit: z.coerce.number().min(1).max(100).default(10).openapi({
    description: "Maximum number of results",
    example: "10",
  }),
});

export const costDriverSchema = z.object({
  name: z.string(),
  cost: z.number(),
  requests: z.number(),
  percentage: z.number(),
});

export const topCostDriversResponseSchema = z.object({
  drivers: z.array(costDriverSchema),
  totalCost: z.number(),
  dimension: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

export const spreadsheetSchemaRequestSchema = z.object({
  document_id: z.string().openapi({
    description: "The ID of the spreadsheet document",
  }),
  sheet: z.string().optional().openapi({
    description: "Sheet name for Excel files (defaults to first sheet)",
  }),
});

export const spreadsheetColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "date", "boolean", "unknown"]),
  nullable: z.boolean(),
  sampleValues: z.array(z.unknown()).optional(),
});

export const spreadsheetSchemaResponseSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  sheets: z.array(z.string()),
  activeSheet: z.string(),
  columns: z.array(spreadsheetColumnSchema),
  rowCount: z.number(),
  sampleData: z.array(z.record(z.string(), z.unknown())),
});

export const spreadsheetSqlRequestSchema = z.object({
  document_id: z.string().openapi({
    description: "The ID of the spreadsheet document",
  }),
  question: z.string().openapi({
    description: "Natural language question about the spreadsheet data",
  }),
});

export const routingDecisionSchema = z.object({
  route: z.enum(["vespa", "duckdb", "hybrid"]),
  confidence: z.number(),
  reason: z.string(),
});

export const spreadsheetSqlResponseSchema = z.object({
  sql: z.string(),
  explanation: z.string(),
  referencedColumns: z.array(z.string()),
  complexity: z.enum(["simple", "moderate", "complex"]),
  viewName: z.string(),
  routing: routingDecisionSchema,
});

export const spreadsheetQueryRequestSchema = z.object({
  document_id: z.string().openapi({
    description: "The ID of the spreadsheet document",
  }),
  sql: z.string().openapi({
    description: "The SQL query to execute",
  }),
  view_name: z.string().openapi({
    description: "The view name from generate SQL",
  }),
  max_rows: z.coerce
    .number()
    .min(1)
    .max(10_000)
    .default(1000)
    .optional()
    .openapi({
      description: "Maximum rows to return (default 1000, max 10000)",
    }),
  timeout_ms: z.coerce
    .number()
    .min(1000)
    .max(30_000)
    .default(10_000)
    .optional()
    .openapi({
      description: "Query timeout in milliseconds (default 10s, max 30s)",
    }),
});

export const spreadsheetQueryResponseSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
  columnTypes: z.record(z.string(), z.string()),
  rowCount: z.number(),
  totalRowsScanned: z.number(),
  executedSql: z.string(),
  latencyMs: z.number(),
});

export const spreadsheetListRequestSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).optional().openapi({
    description: "Maximum number of spreadsheets to return",
  }),
});

export const spreadsheetListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  fileName: z.string().optional(),
  rowCount: z.number(),
  columnCount: z.number(),
  connectorType: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const spreadsheetListResponseSchema = z.object({
  spreadsheets: z.array(spreadsheetListItemSchema),
  total: z.number(),
});
