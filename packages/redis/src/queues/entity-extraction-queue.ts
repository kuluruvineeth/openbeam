import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

export interface EntityExtractionJobData {
  teamId: string;
  documentId: string;
  vespaId: string;
  title: string;
  content: string;
  author?: string;
  connectorType: string;
  connectorId: string;
  connectorMetadata?: Record<string, unknown>;
  traceContext?: TraceContext;
}

export const entityExtractionQueue = new Queue<EntityExtractionJobData>(
  "entity-extraction",
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 200,
      },
    },
  }
);

export function addEntityExtractionJob(
  data: Omit<EntityExtractionJobData, "traceContext">
) {
  const jobData: EntityExtractionJobData = {
    ...data,
    traceContext: extractTraceContext(),
  };

  return entityExtractionQueue.add("extract", jobData, {
    jobId: `entity-${data.documentId}`,
    priority: 10,
  });
}

export function addBulkEntityExtractionJobs(
  jobs: Omit<EntityExtractionJobData, "traceContext">[]
) {
  const traceContext = extractTraceContext();

  return entityExtractionQueue.addBulk(
    jobs.map((data) => ({
      name: "extract",
      data: { ...data, traceContext },
      opts: {
        jobId: `entity-${data.documentId}`,
        priority: 10,
      },
    }))
  );
}

export async function getEntityExtractionQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    entityExtractionQueue.getWaitingCount(),
    entityExtractionQueue.getActiveCount(),
    entityExtractionQueue.getCompletedCount(),
    entityExtractionQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export async function closeEntityExtractionQueue(): Promise<void> {
  await entityExtractionQueue.close();
}
