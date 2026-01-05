import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { getAnalyticsStorage } from "@openplane/analytics/duckdb";
import prisma, {
  countAIUsageLogsForDate,
  getAIUsageLogsForExport,
  getTeamsWithAIUsageForDate,
} from "@openplane/db";
import {
  type AnalyticsExportJobData,
  AnalyticsExportJobDataSchema,
  addAnalyticsExportJob,
  fence,
} from "@openplane/redis";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface AnalyticsExportResult {
  teamId: string;
  date: string;
  exported: number;
  s3Key?: string;
  skipped?: boolean;
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0] as string;
}

async function exportTeamToParquet(
  teamId: string,
  date: string
): Promise<AnalyticsExportResult> {
  const log = logger.child({ teamId, date });

  const count = await countAIUsageLogsForDate(prisma, teamId, date);
  if (count === 0) {
    log.info("No logs to export");
    return { teamId, date, exported: 0, skipped: true };
  }

  const fenceToken = await fence.acquireFence(`analytics-export:${teamId}`);

  try {
    const logs = await getAIUsageLogsForExport(prisma, teamId, date);
    if (logs.length === 0) {
      return { teamId, date, exported: 0, skipped: true };
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

      const instance = await DuckDBInstance.create(":memory:");
      const connection = await instance.connect();

      try {
        await connection.run(`
          COPY (SELECT * FROM read_json_auto('${jsonPath}'))
          TO '${parquetPath}' (FORMAT PARQUET, COMPRESSION ZSTD)
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

      log.info({ exported: logs.length, s3Key }, "Export complete");
      return { teamId, date, exported: logs.length, s3Key };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch((e) => {
        log.warn({ error: e }, "Failed to cleanup temp directory");
      });
    }
  } finally {
    await fence.releaseFence(`analytics-export:${teamId}`, fenceToken);
  }
}

export async function processAnalyticsExportJob(
  job: Job<AnalyticsExportJobData>
): Promise<AnalyticsExportResult | AnalyticsExportResult[]> {
  const span = tracer.startSpan("analytics-export-processor.process", {
    attributes: {
      "job.id": job.id ?? "",
      "job.teamId": job.data.teamId,
      "job.date": job.data.date,
    },
  });

  try {
    const data = AnalyticsExportJobDataSchema.parse(job.data);
    logJobStart("analytics-export", job.id, data);

    if (data.teamId === "__all__" && data.date === "__yesterday__") {
      const date = getYesterdayDate();
      const teams = await getTeamsWithAIUsageForDate(prisma, date);

      if (teams.length === 0) {
        logger.info({ date }, "No teams with AI usage for date");
        span.setStatus({ code: SpanStatusCode.OK });
        return [];
      }

      logger.info({ date, teamCount: teams.length }, "Scheduling team exports");

      for (const teamId of teams) {
        await addAnalyticsExportJob(teamId, date);
      }

      span.setAttributes({ "export.teamsScheduled": teams.length });
      span.setStatus({ code: SpanStatusCode.OK });

      return teams.map((teamId: string) => ({
        teamId,
        date,
        exported: 0,
        skipped: false,
      }));
    }

    const result = await exportTeamToParquet(data.teamId, data.date);

    span.setAttributes({
      "export.exported": result.exported,
      "export.skipped": result.skipped ?? false,
      "export.s3Key": result.s3Key ?? "",
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

export async function triggerAnalyticsExport(
  teamId: string,
  date?: string
): Promise<string> {
  const exportDate = date ?? getYesterdayDate();
  return await addAnalyticsExportJob(teamId, exportDate);
}

export async function triggerAllTeamsExport(date?: string): Promise<string[]> {
  const exportDate = date ?? getYesterdayDate();
  const teams = await getTeamsWithAIUsageForDate(prisma, exportDate);

  const jobIds: string[] = [];
  for (const teamId of teams) {
    const jobId = await addAnalyticsExportJob(teamId, exportDate);
    jobIds.push(jobId);
  }

  return jobIds;
}
