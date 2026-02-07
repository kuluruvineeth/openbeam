import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  escapeSqlStringLiteral,
  getAnalyticsStorage,
} from "@openplane/analytics/duckdb";
import type { ExportToParquetInput, ExportToParquetOutput } from "./types";

export async function exportToParquet(
  input: ExportToParquetInput
): Promise<ExportToParquetOutput> {
  const { teamId, date, logs } = input;

  if (logs.length === 0) {
    return { s3Key: "", recordCount: 0 };
  }

  const storage = getAnalyticsStorage();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-"));
  const jsonPath = path.join(tempDir, "data.json");
  const parquetPath = path.join(tempDir, "data.parquet");

  try {
    const jsonData = logs.map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString(),
    }));
    await fs.writeFile(jsonPath, JSON.stringify(jsonData));

    const { DuckDBInstance } = await import("@duckdb/node-api");
    const instance = await DuckDBInstance.create(":memory:");
    const connection = await instance.connect();

    try {
      await connection.run(`
        COPY (SELECT * FROM read_json_auto('${escapeSqlStringLiteral(jsonPath)}'))
        TO '${escapeSqlStringLiteral(parquetPath)}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `);
    } finally {
      connection.closeSync();
      instance.closeSync();
    }

    const parquetData = await fs.readFile(parquetPath);
    const s3Key = `${teamId}/ai_usage/date=${date}/data.parquet`;
    await storage.upload(s3Key, parquetData, {
      contentType: "application/octet-stream",
    });

    return { s3Key, recordCount: logs.length };
  } finally {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentionally ignore cleanup failures
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
