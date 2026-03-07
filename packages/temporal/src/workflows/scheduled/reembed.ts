import {
  ReembedInputSchema,
  type ReembedOutput,
} from "@openbeam/types/temporal/workflows";
import {
  continueAsNew,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type { ReembedActivities } from "../../activities/reembed/types";
import { cancelSignal, progressQuery, type SyncState } from "../types";

const BATCH_SIZE = 10;

const reembedActivities = proxyActivities<ReembedActivities>({
  startToCloseTimeout: "10m",
  scheduleToCloseTimeout: "30m",
  heartbeatTimeout: "1m",
  retry: {
    initialInterval: "5s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    nonRetryableErrorTypes: ["AuthorizationError"],
  },
});

export async function reembedWorkflow(
  rawInput: unknown
): Promise<ReembedOutput> {
  const input = ReembedInputSchema.parse(rawInput);
  const { connectorId, batchSize = BATCH_SIZE } = input;

  const state: SyncState = {
    processed: 0,
    indexed: 0,
    errors: 0,
    dataAdded: 0,
    dataUpdated: 0,
    dataDeleted: 0,
    stage: "counting",
  };

  let cancelled = false;

  setHandler(progressQuery, () => state);
  setHandler(cancelSignal, () => {
    cancelled = true;
  });

  const teamId = connectorId || undefined;

  const countResult = await reembedActivities.countDocumentsNeedingEmbedding({
    teamId,
  });

  if (countResult.count === 0) {
    return {
      processed: 0,
      updated: 0,
      errors: 0,
    };
  }

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  while (!cancelled) {
    state.stage = "fetching";

    const fetchResult = await reembedActivities.fetchDocumentsForReembed({
      teamId,
      limit: batchSize,
    });

    if (fetchResult.documents.length === 0) {
      break;
    }

    if (fetchResult.emptyDocs.length > 0) {
      await reembedActivities.markEmptyDocuments({
        documentIds: fetchResult.emptyDocs.map((d) => d.id),
      });
      totalProcessed += fetchResult.emptyDocs.length;
    }

    if (fetchResult.validDocs.length > 0) {
      state.stage = "embedding";

      const embedResult = await reembedActivities.generateEmbeddings({
        documents: fetchResult.validDocs,
      });

      state.stage = "updating";

      const updateResult = await reembedActivities.updateDocumentEmbeddings({
        embeddings: embedResult.embeddings,
      });

      totalProcessed += updateResult.processed;
      totalUpdated += updateResult.processed;
      totalErrors += updateResult.failed;
    }

    state.processed = totalProcessed;
    state.indexed = totalUpdated;
    state.errors = totalErrors;
    state.dataUpdated = totalUpdated;

    if (totalProcessed > 1000) {
      await continueAsNew<typeof reembedWorkflow>({
        connectorId,
        batchSize,
        fromVersion: input.fromVersion,
      });
    }
  }

  return {
    processed: totalProcessed,
    updated: totalUpdated,
    errors: totalErrors,
  };
}
