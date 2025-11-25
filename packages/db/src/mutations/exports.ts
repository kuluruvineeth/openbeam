import type { Database } from "../index";
import type {
  ExportFormat,
  ExportJobResult,
  ExportStatus,
  ExportType,
} from "../queries/exports";

// === Export Mutation Types ===

export interface CreateExportJobInput {
  teamId: string;
  userId: string;
  type: ExportType;
  format: ExportFormat;
  scope: Record<string, unknown>;
  notifyOnComplete?: boolean;
}

export interface CompleteExportInput {
  files: ExportJobResult["files"];
  totalRecords: number;
  totalSizeBytes: number;
  downloadUrl: string;
  expiresAt: Date;
}

// === Export Mutations ===

/**
 * Create an export job
 */
export const createExportJob = async (
  db: Database,
  input: CreateExportJobInput
): Promise<string> => {
  const exportJob = await db.exportJob.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      type: input.type,
      format: input.format,
      scope: input.scope,
      status: "PENDING",
      notifyOnComplete: input.notifyOnComplete ?? true,
    },
  });

  return exportJob.id;
};

/**
 * Update export job status
 */
export const updateExportJobStatus = async (
  db: Database,
  exportId: string,
  status: ExportStatus
): Promise<void> => {
  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status,
      updatedAt: new Date(),
    },
  });
};

/**
 * Start processing an export job
 */
export const startExportJob = async (
  db: Database,
  exportId: string
): Promise<void> => {
  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Complete an export job
 */
export const completeExportJob = async (
  db: Database,
  exportId: string,
  result: CompleteExportInput
): Promise<void> => {
  const exportJob = await db.exportJob.findUnique({
    where: { id: exportId },
    select: { startedAt: true },
  });

  const durationMs = exportJob?.startedAt
    ? Date.now() - exportJob.startedAt.getTime()
    : null;

  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status: "COMPLETED",
      files: result.files,
      totalRecords: result.totalRecords,
      totalSizeBytes: result.totalSizeBytes,
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Fail an export job
 */
export const failExportJob = async (
  db: Database,
  exportId: string,
  errorMessage: string
): Promise<void> => {
  const exportJob = await db.exportJob.findUnique({
    where: { id: exportId },
    select: { startedAt: true },
  });

  const durationMs = exportJob?.startedAt
    ? Date.now() - exportJob.startedAt.getTime()
    : null;

  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status: "FAILED",
      errorMessage,
      durationMs,
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Mark export as expired
 */
export const expireExportJob = async (
  db: Database,
  exportId: string
): Promise<void> => {
  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status: "EXPIRED",
      downloadUrl: null, // Clear download URL
      updatedAt: new Date(),
    },
  });
};

/**
 * Expire all old export jobs
 */
export const expireOldExportJobs = async (db: Database): Promise<number> => {
  const result = await db.exportJob.updateMany({
    where: {
      status: "COMPLETED",
      expiresAt: { lt: new Date() },
    },
    data: {
      status: "EXPIRED",
      downloadUrl: null,
      updatedAt: new Date(),
    },
  });

  return result.count;
};

/**
 * Delete old export jobs
 */
export const deleteOldExportJobs = async (
  db: Database,
  olderThan: Date
): Promise<number> => {
  const result = await db.exportJob.deleteMany({
    where: {
      createdAt: { lt: olderThan },
      status: { in: ["EXPIRED", "FAILED"] },
    },
  });

  return result.count;
};

/**
 * Cancel a pending export job
 */
export const cancelExportJob = async (
  db: Database,
  exportId: string
): Promise<boolean> => {
  const exportJob = await db.exportJob.findUnique({
    where: { id: exportId },
    select: { status: true },
  });

  if (!exportJob || exportJob.status !== "PENDING") {
    return false;
  }

  await db.exportJob.update({
    where: { id: exportId },
    data: {
      status: "FAILED",
      errorMessage: "Cancelled by user",
      completedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return true;
};
