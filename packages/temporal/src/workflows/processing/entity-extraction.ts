import {
  EntityExtractionInputSchema,
  type EntityExtractionOutput,
} from "@openplane/types/temporal/workflows";
import { proxyActivities, setHandler } from "@temporalio/workflow";
import type { EntityExtractionActivities } from "../../activities/entities/types";
import { progressQuery, type SyncState } from "../types";

const entityActivities = proxyActivities<EntityExtractionActivities>({
  startToCloseTimeout: "2m",
  heartbeatTimeout: "30s",
  retry: {
    initialInterval: "5s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function entityExtractionWorkflow(
  rawInput: unknown
): Promise<EntityExtractionOutput> {
  const input = EntityExtractionInputSchema.parse(rawInput);
  const state: SyncState = {
    processed: 0,
    indexed: 0,
    errors: 0,
    stage: "initializing",
  };

  setHandler(progressQuery, () => state);

  const documentsToProcess = input.documentIds ?? [];
  let totalProcessed = 0;
  let totalEntities = 0;
  let totalErrors = 0;

  const batchSize = input.batchSize ?? 10;

  for (let i = 0; i < documentsToProcess.length; i += batchSize) {
    const batch = documentsToProcess.slice(i, i + batchSize);

    for (const documentId of batch) {
      state.stage = "extracting";

      try {
        const extractResult = await entityActivities.extractEntities({
          documentId,
          teamId: input.connectorId,
          title: "",
          content: "",
          connectorType: "unknown",
        });

        state.stage = "saving";

        const saveResult = await entityActivities.saveEntities({
          documentId,
          teamId: input.connectorId,
          connectorType: "unknown",
          entities: extractResult.entities,
        });

        totalProcessed += 1;
        totalEntities += saveResult.entitiesCreated;
      } catch {
        totalErrors += 1;
      }

      state.processed = totalProcessed;
      state.indexed = totalEntities;
      state.errors = totalErrors;
    }
  }

  return {
    documentsProcessed: totalProcessed,
    entitiesExtracted: totalEntities,
    errors: totalErrors,
  };
}
