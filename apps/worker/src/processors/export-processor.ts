/**
 * Export Processor
 *
 * Handles data export jobs for compliance, analytics, and user data requests.
 * Supports GDPR data access requests and bulk data exports.
 *
 * Uses @openplane/db queries and mutations for clean separation.
 */
import prisma, {
  completeExportJob,
  type ExportJobResult as DbExportJobResult,
  failExportJob,
  getAuditLogsForExport,
  getUserDataForExport,
  startExportJob,
} from "@openplane/db";
import {
  createLinkedSpan,
  type ExportJobData,
  type ExportJobResult,
  sendNotification,
} from "@openplane/redis";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { workerConfig } from "../config";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

// === Export Handlers ===

type ExportHandler = (
  data: ExportJobData,
  onProgress: (percent: number) => Promise<void>
) => Promise<{
  files: DbExportJobResult["files"];
  totalRecords: number;
}>;

const exportHandlers: Record<string, ExportHandler> = {
  user_data: async (data, onProgress) => {
    const { teamId, scope, format } = data;
    const userIds = scope.userIds || [];

    logger.info({ userIds, format }, "Exporting user data");

    const records: unknown[] = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i]!;

      // Use @db query to get user data
      const userData = await getUserDataForExport(prisma, userId, teamId);

      if (userData.user) {
        records.push({
          type: "user",
          ...userData.user,
          interactionCount: userData.interactions,
          searchCount: userData.searches,
          conversationCount: userData.conversations,
        });
      }

      await onProgress(((i + 1) / userIds.length) * 100);
    }

    // TODO: Write to file and upload to storage
    const file = {
      filename: `user-data-${data.exportId}.${format}`,
      format: format as DbExportJobResult["files"][0]["format"],
      sizeBytes: JSON.stringify(records).length,
      recordCount: records.length,
    };

    return {
      files: [file],
      totalRecords: records.length,
    };
  },

  search_results: async (data, onProgress) => {
    const { format, scope } = data;

    logger.info(
      { query: scope.searchQuery, format },
      "Exporting search results"
    );

    // TODO: Execute search and export results
    await onProgress(100);

    return {
      files: [
        {
          filename: `search-results-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: 0,
          recordCount: 0,
        },
      ],
      totalRecords: 0,
    };
  },

  analytics: async (data, onProgress) => {
    const { teamId, scope, format } = data;
    const startDate = scope.startDate
      ? new Date(scope.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = scope.endDate ? new Date(scope.endDate) : new Date();

    logger.info(
      { teamId, startDate, endDate, format },
      "Exporting analytics data"
    );

    // Get interactions
    const interactions = await prisma.userInteraction.findMany({
      where: {
        teamId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    await onProgress(33);

    // Get search sessions
    const searches = await prisma.searchSession.findMany({
      where: {
        teamId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    await onProgress(66);

    // Get team usage metrics
    const metrics = await prisma.teamUsageMetrics.findMany({
      where: {
        teamId,
        periodStart: { gte: startDate, lte: endDate },
      },
    });

    await onProgress(100);

    const totalRecords = interactions.length + searches.length + metrics.length;

    return {
      files: [
        {
          filename: `analytics-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: 0,
          recordCount: totalRecords,
        },
      ],
      totalRecords,
    };
  },

  conversations: async (data, onProgress) => {
    const { teamId, format } = data;

    logger.info({ teamId, format }, "Exporting conversations");

    const conversations = await prisma.conversation.findMany({
      where: {
        teamId,
        userId: data.userId,
      },
      include: {
        messages: true,
      },
    });

    await onProgress(100);

    return {
      files: [
        {
          filename: `conversations-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: JSON.stringify(conversations).length,
          recordCount: conversations.length,
        },
      ],
      totalRecords: conversations.length,
    };
  },

  documents: async (data, onProgress) => {
    const { teamId, scope, format } = data;
    const connectorIds = scope.connectorIds || [];
    const documentTypes = scope.documentTypes || [];

    logger.info(
      { teamId, connectorIds, documentTypes, format },
      "Exporting documents"
    );

    const where: Record<string, unknown> = {
      connector: { teamId },
    };

    if (connectorIds.length > 0) {
      where.connectorId = { in: connectorIds };
    }

    if (documentTypes.length > 0) {
      where.documentType = { in: documentTypes };
    }

    const count = await prisma.indexedDocument.count({ where });

    // Get documents in batches
    const batchSize = 1000;
    const batches = Math.ceil(count / batchSize);
    let processed = 0;

    for (let i = 0; i < batches; i++) {
      await prisma.indexedDocument.findMany({
        where,
        skip: i * batchSize,
        take: batchSize,
      });

      processed += batchSize;
      await onProgress(Math.min((processed / count) * 100, 100));
    }

    return {
      files: [
        {
          filename: `documents-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: 0,
          recordCount: count,
        },
      ],
      totalRecords: count,
    };
  },

  audit_logs: async (data, onProgress) => {
    const { teamId, scope, format } = data;
    const startDate = scope.startDate ? new Date(scope.startDate) : undefined;
    const endDate = scope.endDate ? new Date(scope.endDate) : undefined;

    logger.info({ teamId, startDate, endDate, format }, "Exporting audit logs");

    // Use @db query for audit logs
    const { logs, count } = await getAuditLogsForExport(prisma, teamId, {
      startDate,
      endDate,
    });

    await onProgress(100);

    return {
      files: [
        {
          filename: `audit-logs-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: JSON.stringify(logs).length,
          recordCount: count,
        },
      ],
      totalRecords: count,
    };
  },

  team_data: async (data, onProgress) => {
    const { teamId, format } = data;

    logger.info({ teamId, format }, "Exporting full team data");

    // Get team info
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        connectors: true,
      },
    });

    await onProgress(20);

    // Get all documents
    const documents = await prisma.indexedDocument.findMany({
      where: { connector: { teamId } },
    });

    await onProgress(50);

    // Get all analytics
    const interactions = await prisma.userInteraction.findMany({
      where: { teamId },
    });

    await onProgress(80);

    const totalRecords = 1 + documents.length + interactions.length;

    await onProgress(100);

    return {
      files: [
        {
          filename: `team-data-${data.exportId}.${format}`,
          format: format as DbExportJobResult["files"][0]["format"],
          sizeBytes: 0,
          recordCount: totalRecords,
        },
      ],
      totalRecords,
    };
  },
};

// === Export Processor ===

export class ExportProcessor extends BaseProcessor<ExportJobData> {
  constructor() {
    super("export", {
      concurrency: workerConfig.export.concurrency,
    });
  }

  protected async processJob(
    job: Job<ExportJobData>
  ): Promise<ExportJobResult> {
    const data = job.data;

    const span = createLinkedSpan(
      "openplane-worker",
      "export-processor.process",
      data.traceContext,
      {
        "job.id": job.id || "",
        "export.id": data.exportId,
        "export.type": data.type,
        "export.format": data.format,
      }
    );

    const startTime = Date.now();

    try {
      logger.info(
        { jobId: job.id, exportId: data.exportId, type: data.type },
        "Processing export job"
      );

      // Update export status using @db mutation
      await startExportJob(prisma, data.exportId);

      // Get export handler
      const handler = exportHandlers[data.type];
      if (!handler) {
        throw new Error(`Unknown export type: ${data.type}`);
      }

      // Execute export with progress updates
      const result = await handler(data, async (percent) => {
        await job.updateProgress(Math.round(percent));
      });

      const durationMs = Date.now() - startTime;

      // Calculate expiration
      const expiresAt = new Date(
        Date.now() + workerConfig.export.expirationDays * 24 * 60 * 60 * 1000
      );

      // TODO: Upload files to storage and get download URLs
      const downloadUrl = `https://storage.openplane.io/exports/${data.exportId}`;

      // Update export as completed using @db mutation
      await completeExportJob(prisma, data.exportId, {
        files: result.files,
        totalRecords: result.totalRecords,
        totalSizeBytes: result.files.reduce((sum, f) => sum + f.sizeBytes, 0),
        downloadUrl,
        expiresAt,
      });

      // Send notification if requested
      if (data.notifyOnComplete) {
        await sendNotification({
          teamId: data.teamId,
          userId: data.userId,
          type: "action_complete",
          title: "Export Complete",
          body: `Your ${data.type} export is ready for download.`,
          channels: ["in_app", "email"],
          priority: "normal",
          actionUrl: downloadUrl,
          actionLabel: "Download Export",
          resourceType: "export",
          resourceId: data.exportId,
        });
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        "export.total_records": result.totalRecords,
        "export.file_count": result.files.length,
        "export.duration_ms": durationMs,
      });

      logger.info(
        {
          exportId: data.exportId,
          totalRecords: result.totalRecords,
          durationMs,
        },
        "Export job completed"
      );

      return {
        exportId: data.exportId,
        status: "completed",
        files: result.files,
        totalRecords: result.totalRecords,
        totalSizeBytes: result.files.reduce((sum, f) => sum + f.sizeBytes, 0),
        startedAt: startTime,
        completedAt: Date.now(),
        durationMs,
        downloadUrl,
        expiresAt: expiresAt.getTime(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update export as failed using @db mutation
      await failExportJob(prisma, data.exportId, errorMessage);

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });
      span.recordException(error as Error);

      logger.error(
        { error: errorMessage, jobId: job.id, exportId: data.exportId },
        "Export job failed"
      );

      return {
        exportId: data.exportId,
        status: "failed",
        error: errorMessage,
        durationMs: Date.now() - startTime,
      };
    } finally {
      span.end();
    }
  }
}
