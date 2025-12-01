import type { Job, Worker } from "bullmq";
import { indexJobsTotal, syncJobsTotal, webhookEventsTotal } from "../metrics";
import logger from "../utils/logger";

function getConnectorId<TData>(job: Job<TData>): string | undefined {
  const data = job.data as Record<string, unknown>;
  return data?.connectorId as string | undefined;
}

export function incrementMetrics<TData>(
  queueName: string,
  status: "completed" | "failed",
  job?: Job<TData>
): void {
  try {
    switch (queueName) {
      case "sync": {
        const connectorId = job ? getConnectorId(job) : "";
        syncJobsTotal.inc({ connector_id: connectorId || "", status });
        break;
      }
      case "index": {
        const connectorId = job ? getConnectorId(job) : "";
        indexJobsTotal.inc({ connector_id: connectorId || "", status });
        break;
      }
      case "webhook": {
        if (job) {
          const data = job.data as Record<string, unknown>;
          const source = (data?.source as string) || "unknown";
          const eventType = (data?.eventType as string) || "unknown";
          webhookEventsTotal.inc({ source, event_type: eventType, status });
        }
        break;
      }
      default:
        logger.debug(
          { queue: queueName },
          "No metrics defined for this queue type"
        );
    }
  } catch (error) {
    logger.error({ error, queue: queueName }, "Failed to increment metrics");
  }
}

export function setupEventHandlers<TData, TResult>(
  worker: Worker<TData, TResult>,
  queueName: string
): void {
  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, `${queueName} job completed`);

    const connectorId = getConnectorId(job);
    if (connectorId || queueName === "webhook") {
      incrementMetrics(queueName, "completed", job);
    }
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, error: error.message },
      `${queueName} job failed`
    );

    if (job) {
      const connectorId = getConnectorId(job);
      if (connectorId || queueName === "webhook") {
        incrementMetrics(queueName, "failed", job);
      }
    }
  });

  worker.on("error", (error) => {
    logger.error({ error }, `${queueName} worker error`);
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, `${queueName} job stalled`);
  });
}

export function logJobStart(
  queueName: string,
  jobId: string | undefined,
  context: Record<string, unknown>
): void {
  logger.info({ jobId, ...context }, `Processing ${queueName} job`);
}

export function logJobComplete(
  queueName: string,
  jobId: string | undefined,
  context: Record<string, unknown>
): void {
  logger.info({ jobId, ...context }, `${queueName} job completed successfully`);
}

export function logJobError(
  queueName: string,
  jobId: string | undefined,
  error: unknown,
  context: Record<string, unknown> = {}
): void {
  const errorInfo =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error: String(error), type: typeof error };

  logger.error({ jobId, ...errorInfo, ...context }, `${queueName} job failed`);
}
