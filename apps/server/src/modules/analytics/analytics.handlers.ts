import type { RouteHandler } from "@hono/zod-openapi";
import { CompletionService, routeQuery } from "@openplane/ai";
import {
  createAnalyticsService,
  getCostBreakdown,
  getTopCostDrivers,
  getUsageTrend,
} from "@openplane/analytics/duckdb";
import { getStorageProvider } from "@openplane/services";
import type { SpreadsheetDocument } from "@openplane/vespa";
import { vespaClient } from "@openplane/vespa";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  costBreakdownRoute,
  executeSpreadsheetQueryRoute,
  generateSpreadsheetSqlRoute,
  getSpreadsheetSchemaRoute,
  listSpreadsheetsRoute,
  topCostDriversRoute,
  usageTrendRoute,
} from "./analytics.routes";

export const costBreakdownHandler: RouteHandler<
  typeof costBreakdownRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const query = c.req.valid("query");

  const result = await getCostBreakdown({
    teamId,
    startDate: query.start_date,
    endDate: query.end_date,
    groupBy: query.group_by ?? ["date", "provider", "model"],
  });

  return c.json(result, 200);
};

export const usageTrendHandler: RouteHandler<
  typeof usageTrendRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const query = c.req.valid("query");

  const result = await getUsageTrend({
    teamId,
    startDate: query.start_date,
    endDate: query.end_date,
    granularity: query.granularity,
  });

  return c.json(result, 200);
};

export const topCostDriversHandler: RouteHandler<
  typeof topCostDriversRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const query = c.req.valid("query");

  const result = await getTopCostDrivers({
    teamId,
    startDate: query.start_date,
    endDate: query.end_date,
    dimension: query.dimension,
    limit: query.limit,
  });

  return c.json(result, 200);
};

const SQL_GENERATION_PROMPT = `You are a SQL expert. Convert the user's natural language question into a valid DuckDB SQL query.

SCHEMA:
{schema}

VIEW NAME: {viewName}

RULES:
1. Use only SELECT statements
2. Reference the table as "{viewName}"
3. Use proper column quoting with double quotes for column names
4. Return valid DuckDB SQL syntax
5. Keep queries simple and efficient

Respond with a JSON object:
{
  "sql": "your SQL query here",
  "explanation": "brief explanation of what the query does"
}`;

function getAnalyticsService() {
  const storage = getStorageProvider();
  const completionService = new CompletionService();

  return createAnalyticsService({
    async downloadFile(storageKey: string): Promise<Buffer> {
      const signedUrl = await storage.getSignedUrl(storageKey, 300);
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },
    async getDocument(documentId: string) {
      const spreadsheetDoc =
        await vespaClient.getSpreadsheetDocument(documentId);
      if (spreadsheetDoc) {
        return {
          id: spreadsheetDoc.id,
          fileName:
            spreadsheetDoc.file_name ?? spreadsheetDoc.title ?? "unknown",
          storageKey: spreadsheetDoc.storage_key,
          mimeType: spreadsheetDoc.mime_type,
          teamId: spreadsheetDoc.team_id,
        };
      }

      const doc = await vespaClient.getDocument(documentId);
      if (!doc) {
        return null;
      }
      const metadata = doc.metadata as Record<string, unknown> | undefined;
      const storageKey =
        (metadata?.storageKey as string | undefined) ??
        (metadata?.storage_key as string | undefined);
      if (!storageKey) {
        return null;
      }
      return {
        id: doc.id,
        fileName: doc.file_name ?? doc.title ?? "unknown",
        storageKey,
        mimeType: doc.mime_type ?? "application/octet-stream",
        teamId: doc.team_id,
      };
    },
    async generateSqlWithLLM({ query, schema, viewName }) {
      const schemaDescription = schema.columns
        .map(
          (c) => `  - ${c.name}: ${c.type}${c.nullable ? " (nullable)" : ""}`
        )
        .join("\n");

      const prompt = SQL_GENERATION_PROMPT.replace(
        "{schema}",
        `Table: ${viewName}\nColumns:\n${schemaDescription}\nRow count: ${schema.rowCount}`
      ).replace(/{viewName}/g, viewName);

      const result = await completionService.complete(
        [{ role: "user", content: `Question: ${query}` }],
        { systemPrompt: prompt, temperature: 0.1 }
      );

      try {
        const parsed = JSON.parse(result.content) as {
          sql: string;
          explanation: string;
        };
        return parsed;
      } catch {
        return {
          sql: `SELECT * FROM "${viewName}" LIMIT 10`,
          explanation: "Fallback query - could not parse LLM response",
        };
      }
    },
  });
}

export const listSpreadsheetsHandler: RouteHandler<
  typeof listSpreadsheetsRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const query = c.req.valid("query");
  const limit = query.limit ?? 20;

  const result = await vespaClient.findQueryableSpreadsheets(teamId, {
    hits: limit,
  });

  const spreadsheets = (result.root.children ?? []).map(
    (child: {
      id: string;
      relevance: number;
      source: string;
      fields: SpreadsheetDocument;
    }) => {
      const doc = child.fields;
      return {
        id: doc.id,
        title: doc.title,
        fileName: doc.file_name,
        rowCount: doc.row_count,
        columnCount: doc.column_names?.length ?? 0,
        connectorType: doc.connector_type,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      };
    }
  );

  return c.json(
    {
      spreadsheets,
      total: result.root.fields?.totalCount ?? spreadsheets.length,
    },
    200
  );
};

export const getSpreadsheetSchemaHandler: RouteHandler<
  typeof getSpreadsheetSchemaRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const documentId = c.req.param("documentId");
  const analyticsService = getAnalyticsService();

  try {
    const schema = await analyticsService.getSpreadsheetSchema(
      documentId,
      teamId
    );
    return c.json(schema, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: "Spreadsheet not found" }, 404);
    }
    return c.json({ error: message }, 400);
  }
};

export const generateSpreadsheetSqlHandler: RouteHandler<
  typeof generateSpreadsheetSqlRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const documentId = c.req.param("documentId");
  const body = c.req.valid("json");
  const analyticsService = getAnalyticsService();

  try {
    const schema = await analyticsService.getSpreadsheetSchema(
      documentId,
      teamId
    );

    const result = await analyticsService.generateSql({
      documentId,
      naturalLanguageQuery: body.question,
      schema,
    });

    const routing = routeQuery(body.question, {
      hasSpreadsheet: true,
      spreadsheetId: documentId,
      availableColumns: schema.columns.map((col) => col.name),
    });

    return c.json(
      {
        sql: result.sql,
        explanation: result.explanation,
        referencedColumns: result.referencedColumns,
        complexity: result.estimatedComplexity,
        viewName: `data_${documentId.replace(/-/g, "_")}`,
        routing: {
          route: routing.route,
          confidence: routing.confidence,
          reason: routing.reason,
        },
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: "Spreadsheet not found" }, 404);
    }
    return c.json({ error: message }, 400);
  }
};

export const executeSpreadsheetQueryHandler: RouteHandler<
  typeof executeSpreadsheetQueryRoute,
  AuthEnv
> = async (c) => {
  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ error: "team_id is required" }, 400);
  }

  const documentId = c.req.param("documentId");
  const body = c.req.valid("json");
  const analyticsService = getAnalyticsService();

  try {
    await analyticsService.getSpreadsheetSchema(documentId, teamId);

    const result = await analyticsService.executeQuery({
      documentId,
      sql: body.sql,
      viewName: body.view_name,
      options: {
        timeoutMs: body.timeout_ms,
        maxRows: body.max_rows,
      },
    });

    return c.json(result, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("not found")) {
      return c.json({ error: "Spreadsheet not found" }, 404);
    }
    return c.json({ error: message }, 400);
  }
};
