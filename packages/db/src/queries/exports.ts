import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

// === Export Query Types ===

export type ExportStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED";

export type ExportType =
  | "user_data"
  | "search_results"
  | "analytics"
  | "conversations"
  | "documents"
  | "audit_logs"
  | "team_data";

export type ExportFormat = "json" | "csv" | "xlsx" | "pdf";

export interface ExportJobResult {
  id: string;
  teamId: string;
  userId: string;
  type: ExportType;
  format: ExportFormat;
  status: ExportStatus;
  scope: Record<string, unknown>;
  files: Array<{
    filename: string;
    format: string;
    sizeBytes: number;
    recordCount: number;
  }>;
  totalRecords: number;
  totalSizeBytes: number;
  downloadUrl: string | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  createdAt: Date;
}

// === Export Queries ===

/**
 * Get export job by ID
 */
export const getExportJob = async (
  db: Database,
  exportId: string
): Promise<ExportJobResult | null> => {
  const exportJob = await db.exportJob.findUnique({
    where: { id: exportId },
  });

  if (!exportJob) return null;

  return {
    id: exportJob.id,
    teamId: exportJob.teamId,
    userId: exportJob.userId,
    type: exportJob.type as ExportType,
    format: exportJob.format as ExportFormat,
    status: exportJob.status as ExportStatus,
    scope: (exportJob.scope as Record<string, unknown>) || {},
    files: (exportJob.files as ExportJobResult["files"]) || [],
    totalRecords: exportJob.totalRecords,
    totalSizeBytes: exportJob.totalSizeBytes,
    downloadUrl: exportJob.downloadUrl,
    errorMessage: exportJob.errorMessage,
    expiresAt: exportJob.expiresAt,
    startedAt: exportJob.startedAt,
    completedAt: exportJob.completedAt,
    durationMs: exportJob.durationMs,
    createdAt: exportJob.createdAt,
  };
};

/**
 * Get user's export jobs
 */
export const getUserExportJobs = async (
  db: Database,
  teamId: string,
  userId: string,
  options: {
    status?: ExportStatus;
    type?: ExportType;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ exports: ExportJobResult[]; total: number }> => {
  const { status, type, limit = 20, offset = 0 } = options;

  const where: Prisma.ExportJobWhereInput = { teamId, userId };
  if (status) {
    where.status = status;
  }
  if (type) {
    where.type = type;
  }

  const [exports, total] = await Promise.all([
    db.exportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.exportJob.count({ where }),
  ]);

  return {
    exports: exports.map((e) => ({
      id: e.id,
      teamId: e.teamId,
      userId: e.userId,
      type: e.type as ExportType,
      format: e.format as ExportFormat,
      status: e.status as ExportStatus,
      scope: (e.scope as Record<string, unknown>) || {},
      files: (e.files as ExportJobResult["files"]) || [],
      totalRecords: e.totalRecords,
      totalSizeBytes: e.totalSizeBytes,
      downloadUrl: e.downloadUrl,
      errorMessage: e.errorMessage,
      expiresAt: e.expiresAt,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      durationMs: e.durationMs,
      createdAt: e.createdAt,
    })),
    total,
  };
};

/**
 * Get team's export jobs (for admins)
 */
export const getTeamExportJobs = async (
  db: Database,
  teamId: string,
  options: {
    status?: ExportStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ exports: ExportJobResult[]; total: number }> => {
  const { status, limit = 50, offset = 0 } = options;

  const where: Prisma.ExportJobWhereInput = { teamId };
  if (status) {
    where.status = status;
  }

  const [exports, total] = await Promise.all([
    db.exportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.exportJob.count({ where }),
  ]);

  return {
    exports: exports.map((e) => ({
      id: e.id,
      teamId: e.teamId,
      userId: e.userId,
      type: e.type as ExportType,
      format: e.format as ExportFormat,
      status: e.status as ExportStatus,
      scope: (e.scope as Record<string, unknown>) || {},
      files: (e.files as ExportJobResult["files"]) || [],
      totalRecords: e.totalRecords,
      totalSizeBytes: e.totalSizeBytes,
      downloadUrl: e.downloadUrl,
      errorMessage: e.errorMessage,
      expiresAt: e.expiresAt,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      durationMs: e.durationMs,
      createdAt: e.createdAt,
    })),
    total,
  };
};

/**
 * Get expired export jobs
 */
export const getExpiredExportJobs = async (
  db: Database
): Promise<
  Array<{ id: string; teamId: string; downloadUrl: string | null }>
> => {
  const exports = await db.exportJob.findMany({
    where: {
      status: "COMPLETED",
      expiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      teamId: true,
      downloadUrl: true,
    },
  });

  return exports;
};

/**
 * Get pending export jobs
 */
export const getPendingExportJobs = async (
  db: Database,
  options: { limit?: number } = {}
): Promise<ExportJobResult[]> => {
  const { limit = 10 } = options;

  const exports = await db.exportJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return exports.map((e) => ({
    id: e.id,
    teamId: e.teamId,
    userId: e.userId,
    type: e.type as ExportType,
    format: e.format as ExportFormat,
    status: e.status as ExportStatus,
    scope: (e.scope as Record<string, unknown>) || {},
    files: (e.files as ExportJobResult["files"]) || [],
    totalRecords: e.totalRecords,
    totalSizeBytes: e.totalSizeBytes,
    downloadUrl: e.downloadUrl,
    errorMessage: e.errorMessage,
    expiresAt: e.expiresAt,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    durationMs: e.durationMs,
    createdAt: e.createdAt,
  }));
};

/**
 * Check if user has active export
 */
export const hasActiveExport = async (
  db: Database,
  teamId: string,
  userId: string,
  type: ExportType
): Promise<boolean> => {
  const count = await db.exportJob.count({
    where: {
      teamId,
      userId,
      type,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  return count > 0;
};

/**
 * Get user data for GDPR export
 */
export const getUserDataForExport = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<{
  user: Record<string, unknown> | null;
  interactions: number;
  searches: number;
  conversations: number;
}> => {
  const [user, interactionCount, searchCount, conversationCount] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        include: {
          teams: {
            where: { teamId },
          },
        },
      }),
      db.userInteraction.count({
        where: { userId, teamId },
      }),
      db.searchSession.count({
        where: { userId, teamId },
      }),
      db.conversation.count({
        where: { userId, teamId },
      }),
    ]);

  return {
    user: user as unknown as Record<string, unknown>,
    interactions: interactionCount,
    searches: searchCount,
    conversations: conversationCount,
  };
};

/**
 * Get audit logs for export
 */
export const getAuditLogsForExport = async (
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<{ logs: unknown[]; count: number }> => {
  const where: Prisma.AuditLogWhereInput = { teamId };

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [logs, count] = await Promise.all([
    db.auditLog.findMany({ where }),
    db.auditLog.count({ where }),
  ]);

  return { logs, count };
};
