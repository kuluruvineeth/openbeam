/**
 * Export Queue
 *
 * Handles data export jobs for compliance, analytics, and user data requests.
 * Supports GDPR data access requests and bulk data exports.
 */
import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

// === Export Types ===

export type ExportFormat = "json" | "csv" | "parquet" | "xlsx";

export type ExportType =
  | "user_data" // GDPR data access request
  | "search_results" // Export search results
  | "analytics" // Export analytics data
  | "conversations" // Export chat history
  | "documents" // Export indexed documents
  | "audit_logs" // Export audit logs
  | "team_data"; // Full team data export

export type ExportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

export interface ExportJobData {
  exportId: string;
  teamId: string;
  userId: string; // Who requested the export

  // Export configuration
  type: ExportType;
  format: ExportFormat;

  // Scope
  scope: ExportScope;

  // Options
  options?: ExportOptions;

  // GDPR-specific
  dataRequestId?: string; // Link to DataAccessRequest

  // Notification
  notifyOnComplete?: boolean;
  notifyEmail?: string;

  // Tracing
  traceContext?: TraceContext;
}

export interface ExportScope {
  // Time range
  startDate?: string; // ISO date
  endDate?: string;

  // Filters
  connectorIds?: string[];
  documentTypes?: string[];
  userIds?: string[]; // For team exports
  searchQuery?: string; // For search result exports

  // Limits
  maxRecords?: number;
}

export interface ExportOptions {
  // Formatting
  includeMetadata?: boolean;
  includeAttachments?: boolean;
  redactPII?: boolean;

  // Compression
  compress?: boolean; // Create zip file

  // Encryption
  encrypt?: boolean;
  encryptionPassword?: string; // For encrypted exports

  // Chunking (for large exports)
  chunkSize?: number; // Records per file
}

export interface ExportJobResult {
  exportId: string;
  status: ExportStatus;

  // Output
  files?: ExportFile[];
  totalRecords?: number;
  totalSizeBytes?: number;

  // Timing
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;

  // Error
  error?: string;

  // Download
  downloadUrl?: string;
  expiresAt?: number;
}

export interface ExportFile {
  filename: string;
  format: ExportFormat;
  sizeBytes: number;
  recordCount: number;
  url?: string;
  checksum?: string;
}

// === Queue Configuration ===

export const EXPORT_QUEUE_NAME = "export";

export const exportQueue = new Queue<ExportJobData, ExportJobResult>(
  EXPORT_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 2, // Exports are expensive, limit retries
      backoff: {
        type: "exponential",
        delay: 10_000, // 10 second initial delay
      },
      removeOnComplete: {
        count: 100,
        age: 7 * 24 * 3600, // Keep for 7 days
      },
      removeOnFail: {
        count: 500,
        age: 30 * 24 * 3600, // Keep failures for 30 days
      },
    },
  }
);

// === Queue Operations ===

/**
 * Create a new export job
 */
export async function createExportJob(
  data: Omit<ExportJobData, "exportId" | "traceContext">,
  options?: {
    priority?: number;
  }
) {
  const exportId = `export-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const jobData: ExportJobData = {
    ...data,
    exportId,
    traceContext: extractTraceContext(),
  };

  // Priority based on export type
  const priorityMap: Record<ExportType, number> = {
    user_data: 10, // GDPR requests are high priority
    search_results: 5,
    conversations: 5,
    analytics: 3,
    documents: 3,
    audit_logs: 7,
    team_data: 2, // Large exports are low priority
  };

  return await exportQueue.add("export", jobData, {
    priority: options?.priority ?? priorityMap[data.type],
    jobId: exportId,
  });
}

/**
 * Get export job status
 */
export async function getExportJobStatus(exportId: string): Promise<{
  status: ExportStatus;
  progress?: number;
  result?: ExportJobResult;
}> {
  const job = await exportQueue.getJob(exportId);

  if (!job) {
    return { status: "expired" };
  }

  const state = await job.getState();

  switch (state) {
    case "waiting":
    case "delayed":
      return { status: "pending" };
    case "active":
      return { status: "processing", progress: job.progress as number };
    case "completed":
      return { status: "completed", result: job.returnvalue };
    case "failed":
      return {
        status: "failed",
        result: { exportId, status: "failed", error: job.failedReason },
      };
    default:
      return { status: "expired" };
  }
}

/**
 * Cancel an export job
 */
export async function cancelExportJob(exportId: string): Promise<boolean> {
  const job = await exportQueue.getJob(exportId);
  if (job) {
    const state = await job.getState();
    if (state === "waiting" || state === "delayed") {
      await job.remove();
      return true;
    }
  }
  return false;
}

// === Convenience Functions ===

/**
 * Create a GDPR data access request export
 */
export async function createGDPRExport(params: {
  teamId: string;
  userId: string;
  subjectUserId: string;
  dataRequestId: string;
  notifyEmail: string;
}) {
  return await createExportJob(
    {
      teamId: params.teamId,
      userId: params.userId,
      type: "user_data",
      format: "json",
      scope: {
        userIds: [params.subjectUserId],
      },
      options: {
        includeMetadata: true,
        compress: true,
        encrypt: true,
      },
      dataRequestId: params.dataRequestId,
      notifyOnComplete: true,
      notifyEmail: params.notifyEmail,
    },
    { priority: 10 }
  );
}

/**
 * Create a search results export
 */
export async function createSearchResultsExport(params: {
  teamId: string;
  userId: string;
  searchQuery: string;
  filters?: Record<string, unknown>;
  format?: ExportFormat;
  maxRecords?: number;
}) {
  return await createExportJob({
    teamId: params.teamId,
    userId: params.userId,
    type: "search_results",
    format: params.format || "csv",
    scope: {
      searchQuery: params.searchQuery,
      maxRecords: params.maxRecords || 10_000,
    },
    options: {
      includeMetadata: false,
      compress: true,
    },
    notifyOnComplete: true,
  });
}

/**
 * Create an analytics export
 */
export async function createAnalyticsExport(params: {
  teamId: string;
  userId: string;
  startDate: string;
  endDate: string;
  format?: ExportFormat;
}) {
  return await createExportJob({
    teamId: params.teamId,
    userId: params.userId,
    type: "analytics",
    format: params.format || "csv",
    scope: {
      startDate: params.startDate,
      endDate: params.endDate,
    },
    options: {
      includeMetadata: true,
      compress: true,
    },
    notifyOnComplete: true,
  });
}

/**
 * Create an audit log export
 */
export async function createAuditLogExport(params: {
  teamId: string;
  userId: string;
  startDate: string;
  endDate: string;
  format?: ExportFormat;
}) {
  return await createExportJob(
    {
      teamId: params.teamId,
      userId: params.userId,
      type: "audit_logs",
      format: params.format || "json",
      scope: {
        startDate: params.startDate,
        endDate: params.endDate,
      },
      options: {
        includeMetadata: true,
        compress: true,
        encrypt: true, // Audit logs should be encrypted
      },
      notifyOnComplete: true,
    },
    { priority: 7 }
  );
}

/**
 * Create a conversation export
 */
export async function createConversationExport(params: {
  teamId: string;
  userId: string;
  conversationIds?: string[];
  startDate?: string;
  endDate?: string;
  format?: ExportFormat;
}) {
  return await createExportJob({
    teamId: params.teamId,
    userId: params.userId,
    type: "conversations",
    format: params.format || "json",
    scope: {
      startDate: params.startDate,
      endDate: params.endDate,
      // Note: conversationIds would be passed via options or a separate field
    },
    options: {
      includeMetadata: true,
      compress: true,
    },
    notifyOnComplete: true,
  });
}

/**
 * Get export queue metrics
 */
export async function getExportQueueMetrics() {
  const counts = await exportQueue.getJobCounts();
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0) +
      (counts.delayed || 0),
  };
}

/**
 * Get active exports for a user
 */
export async function getActiveExportsForUser(
  userId: string
): Promise<
  Array<{ exportId: string; type: ExportType; status: ExportStatus }>
> {
  const [waiting, active] = await Promise.all([
    exportQueue.getWaiting(),
    exportQueue.getActive(),
  ]);

  const allJobs = [...waiting, ...active];

  return allJobs
    .filter((job) => job.data.userId === userId)
    .map((job) => ({
      exportId: job.data.exportId,
      type: job.data.type,
      status: "processing" as ExportStatus,
    }));
}

/**
 * Close the export queue
 */
export async function closeExportQueue(): Promise<void> {
  await exportQueue.close();
}
