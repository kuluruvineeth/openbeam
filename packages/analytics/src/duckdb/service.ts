import { createDuckDBClient, type DuckDBClient } from "./client";
import { DuckDBApiError, DuckDBErrorCodes } from "./types";
import { assertValidSQL, extractReferencedColumns } from "./validation";

export interface SpreadsheetColumn {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "unknown";
  nullable: boolean;
  sampleValues?: unknown[];
}

export interface SpreadsheetSchema {
  documentId: string;
  fileName: string;
  sheets: string[];
  activeSheet: string;
  columns: SpreadsheetColumn[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

export interface GenerateSqlParams {
  documentId: string;
  naturalLanguageQuery: string;
  schema: SpreadsheetSchema;
}

export interface GenerateSqlResult {
  sql: string;
  explanation: string;
  referencedColumns: string[];
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface ExecuteQueryParams {
  documentId: string;
  sql: string;
  viewName: string;
  options?: {
    timeoutMs?: number;
    maxRows?: number;
  };
}

export interface SpreadsheetQueryResult {
  rows: Record<string, unknown>[];
  columnTypes: Record<string, string>;
  rowCount: number;
  totalRowsScanned: number;
  executedSql: string;
  latencyMs: number;
}

export interface DocumentInfo {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  teamId: string;
}

export interface AnalyticsServiceDeps {
  downloadFile: (storageKey: string) => Promise<Buffer>;
  getDocument: (documentId: string) => Promise<DocumentInfo | null>;
  generateSqlWithLLM: (params: {
    query: string;
    schema: SpreadsheetSchema;
    viewName: string;
  }) => Promise<{ sql: string; explanation: string }>;
}

const clientCache = new Map<
  string,
  { client: DuckDBClient; viewName: string }
>();

function getFileType(mimeType: string): "csv" | "xlsx" | "parquet" {
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return "xlsx";
  }
  if (mimeType === "text/csv" || mimeType === "application/csv") {
    return "csv";
  }
  if (
    mimeType === "application/parquet" ||
    mimeType === "application/x-parquet"
  ) {
    return "parquet";
  }
  throw new DuckDBApiError({
    message: `Unsupported file type: ${mimeType}`,
    code: DuckDBErrorCodes.INTERNAL_ERROR,
    retryable: false,
  });
}

export function createAnalyticsService(deps: AnalyticsServiceDeps) {
  async function loadSpreadsheetIfNeeded(
    documentId: string,
    teamId: string
  ): Promise<{ client: DuckDBClient; viewName: string; fileName: string }> {
    const cached = clientCache.get(documentId);
    if (cached) {
      return { ...cached, fileName: "" };
    }

    const doc = await deps.getDocument(documentId);
    if (!doc) {
      throw new DuckDBApiError({
        message: `Document not found: ${documentId}`,
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    }

    if (doc.teamId !== teamId) {
      throw new DuckDBApiError({
        message: "Unauthorized access to document",
        code: DuckDBErrorCodes.INTERNAL_ERROR,
        retryable: false,
      });
    }

    const fileBuffer = await deps.downloadFile(doc.storageKey);
    const fileType = getFileType(doc.mimeType);

    const client = createDuckDBClient({
      resourceConfig: {
        maxMemoryMb: 512,
        threads: 2,
      },
    });

    await client.initialize();

    const { viewName, validation } = await client.loadSpreadsheet(
      documentId,
      fileBuffer,
      fileType
    );

    if (!validation.valid) {
      await client.close();
      throw new DuckDBApiError({
        message: validation.reason ?? "File validation failed",
        code: DuckDBErrorCodes.FILE_TOO_LARGE,
        retryable: false,
      });
    }

    clientCache.set(documentId, { client, viewName });

    setTimeout(
      async () => {
        const entry = clientCache.get(documentId);
        if (entry) {
          await entry.client.close();
          clientCache.delete(documentId);
        }
      },
      5 * 60 * 1000
    );

    return { client, viewName, fileName: doc.fileName };
  }

  return {
    async getSpreadsheetSchema(
      documentId: string,
      teamId: string
    ): Promise<SpreadsheetSchema> {
      const doc = await deps.getDocument(documentId);
      if (!doc) {
        throw new DuckDBApiError({
          message: `Document not found: ${documentId}`,
          code: DuckDBErrorCodes.INTERNAL_ERROR,
          retryable: false,
        });
      }

      const { client, viewName } = await loadSpreadsheetIfNeeded(
        documentId,
        teamId
      );

      const columns = await client.getSchema(viewName);
      const sampleData = await client.getSampleData(viewName, 5);

      const countResult = await client.query(
        documentId,
        `SELECT COUNT(*) as count FROM "${viewName}"`,
        viewName
      );
      const rowCount = Number(countResult.rows[0]?.count ?? 0);

      return {
        documentId,
        fileName: doc.fileName,
        sheets: ["Sheet1"],
        activeSheet: "Sheet1",
        columns,
        rowCount,
        sampleData,
      };
    },

    async generateSql(params: GenerateSqlParams): Promise<GenerateSqlResult> {
      const viewName = `data_${params.documentId.replace(/-/g, "_")}`;

      const { sql, explanation } = await deps.generateSqlWithLLM({
        query: params.naturalLanguageQuery,
        schema: params.schema,
        viewName,
      });

      const referencedColumns = extractReferencedColumns(sql);

      let complexity: "simple" | "moderate" | "complex" = "simple";
      const lowerSql = sql.toLowerCase();
      if (
        lowerSql.includes("join") ||
        lowerSql.includes("subquery") ||
        (lowerSql.match(/select/g)?.length ?? 0) > 1
      ) {
        complexity = "complex";
      } else if (
        lowerSql.includes("group by") ||
        lowerSql.includes("having") ||
        lowerSql.includes("order by")
      ) {
        complexity = "moderate";
      }

      return {
        sql,
        explanation,
        referencedColumns,
        estimatedComplexity: complexity,
      };
    },

    async executeQuery(
      params: ExecuteQueryParams
    ): Promise<SpreadsheetQueryResult> {
      const cached = clientCache.get(params.documentId);
      if (!cached) {
        throw new DuckDBApiError({
          message:
            "Spreadsheet not loaded. Call getSpreadsheetSchema first to load the data.",
          code: DuckDBErrorCodes.INTERNAL_ERROR,
          retryable: false,
        });
      }

      assertValidSQL(params.sql, [params.viewName, "data"]);

      const result = await cached.client.query(
        params.documentId,
        params.sql,
        params.viewName,
        {
          timeoutMs: params.options?.timeoutMs ?? 10_000,
          maxResultRows: params.options?.maxRows ?? 1000,
        }
      );

      return {
        rows: result.rows,
        columnTypes: result.columnTypes,
        rowCount: result.rowCount,
        totalRowsScanned: result.totalRowsScanned,
        executedSql: result.executedSql,
        latencyMs: result.latencyMs,
      };
    },

    async cleanup(documentId: string): Promise<void> {
      const cached = clientCache.get(documentId);
      if (cached) {
        await cached.client.close();
        clientCache.delete(documentId);
      }
    },

    async cleanupAll(): Promise<void> {
      for (const [id, entry] of clientCache) {
        await entry.client.close();
        clientCache.delete(id);
      }
    },
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
