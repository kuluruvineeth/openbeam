import type { EntityExtractionJobData } from "@openplane/redis";
import type { ProcessorResult } from "../types";
import { createWorker } from "../worker-factory";
import { processEntityExtractionJob } from "./handler";

interface EntityExtractionResult {
  documentId: string;
  entitiesCreated: number;
  relationsCreated: number;
  elapsedMs: number;
}

export function createEntityExtractionProcessor(): ProcessorResult {
  return createWorker<EntityExtractionJobData, EntityExtractionResult>({
    queueName: "entity-extraction",
    handler: processEntityExtractionJob,
    concurrency: 5,
    workerOptions: {
      lockDuration: 60_000,
    },
  });
}

export { processEntityExtractionJob } from "./handler";
