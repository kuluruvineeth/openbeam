import { z } from "zod";
import { createDuckDBClient, type DuckDBClient } from "../client";
import { getAnalyticsStorage, listAnalyticsParquetFiles } from "../storage";
import { DuckDBApiError, DuckDBErrorCodes, type QueryResult } from "../types";

export const CostBreakdownParamsSchema = z.object({
  teamId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z
    .array(z.enum(["provider", "model", "workflow", "user", "date"]))
    .optional()
    .default(["date", "provider", "model"]),
});

export type CostBreakdownParams = z.infer<typeof CostBreakdownParamsSchema>;

export interface CostBreakdownResult {
  dimensions: Record<string, string | null>;
  cost: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  avgLatencyMs: number;
}

export interface CostBreakdownResponse {
  results: CostBreakdownResult[];
  totalCost: number;
  totalRequests: number;
  period: {
    start: string;
    end: string;
  };
  dataSource: "parquet" | "empty";
}

function buildCostBreakdownSql(
  parquetUrls: string[],
  params: CostBreakdownParams
): string {
  const groupCols = params.groupBy;
  const groupByExpressions = groupCols.map((col) => {
    if (col === "date") {
      return "DATE_TRUNC('day', \"createdAt\")";
    }
    if (col === "user") {
      return '"userId"';
    }
    return `"${col}"`;
  });

  const selectExpressions = groupCols.map((col) => {
    if (col === "date") {
      return 'DATE_TRUNC(\'day\', "createdAt") as "date"';
    }
    if (col === "user") {
      return '"userId" as "user"';
    }
    return `"${col}"`;
  });

  const parquetList = parquetUrls.map((url) => `'${url}'`).join(", ");

  return `
    SELECT
      ${selectExpressions.join(", ")},
      CAST(SUM("totalCostUsd") AS DOUBLE) as cost,
      CAST(COUNT(*) AS BIGINT) as requests,
      CAST(SUM("inputTokens") AS BIGINT) as input_tokens,
      CAST(SUM("outputTokens") AS BIGINT) as output_tokens,
      CAST(AVG("latencyMs") AS DOUBLE) as avg_latency_ms
    FROM read_parquet([${parquetList}])
    WHERE "createdAt" >= '${params.startDate.toISOString()}'
      AND "createdAt" < '${params.endDate.toISOString()}'
    GROUP BY ${groupByExpressions.join(", ")}
    ORDER BY cost DESC
    LIMIT 1000
  `;
}

export async function getCostBreakdown(
  params: CostBreakdownParams
): Promise<CostBreakdownResponse> {
  const storage = getAnalyticsStorage();
  const startDateStr = params.startDate.toISOString().split("T")[0];
  const endDateStr = params.endDate.toISOString().split("T")[0];

  const parquetFiles = await listAnalyticsParquetFiles(storage, params.teamId, {
    startDate: startDateStr,
    endDate: endDateStr,
  });

  if (parquetFiles.length === 0) {
    return {
      results: [],
      totalCost: 0,
      totalRequests: 0,
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
      dataSource: "empty",
    };
  }

  const signedUrls = await Promise.all(
    parquetFiles.map((file) => storage.getSignedUrl(file, 300))
  );

  const client = createDuckDBClient({
    resourceConfig: {
      maxMemoryMb: 256,
      threads: 2,
    },
  });

  try {
    await client.initialize();

    const sql = buildCostBreakdownSql(signedUrls, params);
    const result = await executeAnalyticsQuery(client, sql);

    const rows = result.rows as Record<string, unknown>[];
    const groupCols = params.groupBy;

    let totalCost = 0;
    let totalRequests = 0;

    const results: CostBreakdownResult[] = rows.map((row) => {
      const cost = Number(row.cost ?? 0);
      const requests = Number(row.requests ?? 0);
      totalCost += cost;
      totalRequests += requests;

      return {
        dimensions: Object.fromEntries(
          groupCols.map((col) => [col, row[col] as string | null])
        ),
        cost,
        requests,
        inputTokens: Number(row.input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0),
        avgLatencyMs: Number(row.avg_latency_ms ?? 0),
      };
    });

    return {
      results,
      totalCost,
      totalRequests,
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
      dataSource: "parquet",
    };
  } finally {
    await client.close();
  }
}

async function executeAnalyticsQuery(
  client: DuckDBClient,
  sql: string
): Promise<QueryResult> {
  try {
    const result = await client.query("analytics", sql, "data");
    return result;
  } catch (error) {
    if (error instanceof DuckDBApiError) {
      throw error;
    }
    throw new DuckDBApiError({
      message: `Analytics query failed: ${error instanceof Error ? error.message : String(error)}`,
      code: DuckDBErrorCodes.INTERNAL_ERROR,
      retryable: false,
    });
  }
}

export const UsageTrendParamsSchema = z.object({
  teamId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  granularity: z.enum(["hour", "day", "week"]).default("day"),
});

export type UsageTrendParams = z.infer<typeof UsageTrendParamsSchema>;

export interface UsageTrendPoint {
  timestamp: string;
  cost: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageTrendResponse {
  points: UsageTrendPoint[];
  period: {
    start: string;
    end: string;
  };
  granularity: string;
}

export async function getUsageTrend(
  params: UsageTrendParams
): Promise<UsageTrendResponse> {
  const storage = getAnalyticsStorage();
  const startDateStr = params.startDate.toISOString().split("T")[0];
  const endDateStr = params.endDate.toISOString().split("T")[0];

  const parquetFiles = await listAnalyticsParquetFiles(storage, params.teamId, {
    startDate: startDateStr,
    endDate: endDateStr,
  });

  if (parquetFiles.length === 0) {
    return {
      points: [],
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
      granularity: params.granularity,
    };
  }

  const signedUrls = await Promise.all(
    parquetFiles.map((file) => storage.getSignedUrl(file, 300))
  );

  const client = createDuckDBClient({
    resourceConfig: {
      maxMemoryMb: 256,
      threads: 2,
    },
  });

  try {
    await client.initialize();

    const parquetList = signedUrls.map((url: string) => `'${url}'`).join(", ");

    let truncUnit: "hour" | "day" | "week" = "day";
    if (params.granularity === "hour") {
      truncUnit = "hour";
    } else if (params.granularity === "week") {
      truncUnit = "week";
    }

    const sql = `
      SELECT
        DATE_TRUNC('${truncUnit}', "createdAt") as timestamp,
        CAST(SUM("totalCostUsd") AS DOUBLE) as cost,
        CAST(COUNT(*) AS BIGINT) as requests,
        CAST(SUM("inputTokens") AS BIGINT) as input_tokens,
        CAST(SUM("outputTokens") AS BIGINT) as output_tokens
      FROM read_parquet([${parquetList}])
      WHERE "createdAt" >= '${params.startDate.toISOString()}'
        AND "createdAt" < '${params.endDate.toISOString()}'
      GROUP BY timestamp
      ORDER BY timestamp ASC
    `;

    const result = await executeAnalyticsQuery(client, sql);
    const rows = result.rows as Record<string, unknown>[];

    const points: UsageTrendPoint[] = rows.map((row) => ({
      timestamp: String(row.timestamp),
      cost: Number(row.cost ?? 0),
      requests: Number(row.requests ?? 0),
      inputTokens: Number(row.input_tokens ?? 0),
      outputTokens: Number(row.output_tokens ?? 0),
    }));

    return {
      points,
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
      granularity: params.granularity,
    };
  } finally {
    await client.close();
  }
}

export const TopCostDriversParamsSchema = z.object({
  teamId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dimension: z.enum(["model", "workflow", "user"]),
  limit: z.number().min(1).max(100).default(10),
});

export type TopCostDriversParams = z.infer<typeof TopCostDriversParamsSchema>;

export interface CostDriverResult {
  name: string;
  cost: number;
  requests: number;
  percentage: number;
}

export interface TopCostDriversResponse {
  drivers: CostDriverResult[];
  totalCost: number;
  dimension: string;
  period: {
    start: string;
    end: string;
  };
}

export async function getTopCostDrivers(
  params: TopCostDriversParams
): Promise<TopCostDriversResponse> {
  const storage = getAnalyticsStorage();
  const startDateStr = params.startDate.toISOString().split("T")[0];
  const endDateStr = params.endDate.toISOString().split("T")[0];

  const parquetFiles = await listAnalyticsParquetFiles(storage, params.teamId, {
    startDate: startDateStr,
    endDate: endDateStr,
  });

  if (parquetFiles.length === 0) {
    return {
      drivers: [],
      totalCost: 0,
      dimension: params.dimension,
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
    };
  }

  const signedUrls = await Promise.all(
    parquetFiles.map((file) => storage.getSignedUrl(file, 300))
  );

  const client = createDuckDBClient({
    resourceConfig: {
      maxMemoryMb: 256,
      threads: 2,
    },
  });

  try {
    await client.initialize();

    const parquetList = signedUrls.map((url: string) => `'${url}'`).join(", ");

    let dimColumn: string;
    if (params.dimension === "user") {
      dimColumn = "userId";
    } else if (params.dimension === "model") {
      dimColumn = "CONCAT(provider, '/', model)";
    } else {
      dimColumn = params.dimension;
    }

    const sql = `
      WITH totals AS (
        SELECT CAST(SUM("totalCostUsd") AS DOUBLE) as total_cost
        FROM read_parquet([${parquetList}])
        WHERE "createdAt" >= '${params.startDate.toISOString()}'
          AND "createdAt" < '${params.endDate.toISOString()}'
      )
      SELECT
        CAST(${dimColumn} AS VARCHAR) as name,
        CAST(SUM("totalCostUsd") AS DOUBLE) as cost,
        CAST(COUNT(*) AS BIGINT) as requests,
        CAST(SUM("totalCostUsd") / (SELECT total_cost FROM totals) * 100 AS DOUBLE) as percentage
      FROM read_parquet([${parquetList}])
      WHERE "createdAt" >= '${params.startDate.toISOString()}'
        AND "createdAt" < '${params.endDate.toISOString()}'
        AND ${dimColumn} IS NOT NULL
      GROUP BY name
      ORDER BY cost DESC
      LIMIT ${params.limit}
    `;

    const result = await executeAnalyticsQuery(client, sql);
    const rows = result.rows as Record<string, unknown>[];

    let totalCost = 0;
    const drivers: CostDriverResult[] = rows.map((row) => {
      const cost = Number(row.cost ?? 0);
      totalCost += cost;
      return {
        name: String(row.name ?? "unknown"),
        cost,
        requests: Number(row.requests ?? 0),
        percentage: Number(row.percentage ?? 0),
      };
    });

    return {
      drivers,
      totalCost,
      dimension: params.dimension,
      period: {
        start: params.startDate.toISOString(),
        end: params.endDate.toISOString(),
      },
    };
  } finally {
    await client.close();
  }
}
