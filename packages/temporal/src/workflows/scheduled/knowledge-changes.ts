import {
  ProcessKnowledgeChangesInputSchema,
  type ProcessKnowledgeChangesOutput,
} from "@openplane/types/temporal/workflows/knowledge-changes";
import { continueAsNew, proxyActivities } from "@temporalio/workflow";
import type { KnowledgeChangeActivities } from "../../activities/knowledge/types";

const changeActivities = proxyActivities<KnowledgeChangeActivities>({
  startToCloseTimeout: "5 minutes",
  heartbeatTimeout: "1 minute",
  retry: {
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumAttempts: 5,
    maximumInterval: "1m",
    nonRetryableErrorTypes: ["AuthorizationError", "ConstraintViolationError"],
  },
});

const BATCH_LIMIT = 1000;

export async function processKnowledgeChangesWorkflow(
  rawInput: unknown
): Promise<ProcessKnowledgeChangesOutput> {
  const input = ProcessKnowledgeChangesInputSchema.parse(rawInput);

  const changes = await changeActivities.fetchUnprocessedChanges({
    teamId: input.teamId,
    connectorId: input.connectorId,
    syncHistoryId: input.syncHistoryId,
    limit: BATCH_LIMIT,
  });

  if (changes.length === 0) {
    return { processed: 0, entitiesUpdated: 0, edgesUpdated: 0 };
  }

  const deletedChanges = changes.filter((c) => c.changeType === "DELETED");
  const nonDeletedChanges = changes.filter((c) => c.changeType !== "DELETED");

  for (const deleted of deletedChanges) {
    await changeActivities.invalidateEdges({
      teamId: input.teamId,
      documentId: deleted.documentId,
    });
  }

  let entitiesUpdated = 0;
  let edgesUpdated = 0;

  if (nonDeletedChanges.length > 0) {
    const extractionResult = await changeActivities.extractEntitiesFromChanges({
      teamId: input.teamId,
      documentIds: nonDeletedChanges.map((c) => c.documentId),
    });

    entitiesUpdated = extractionResult.entitiesUpdated;

    if (extractionResult.mentions.length > 0) {
      const edgeResult = await changeActivities.updateCoOccurrenceEdges({
        teamId: input.teamId,
        entityMentions: extractionResult.mentions,
      });
      edgesUpdated = edgeResult.edgesCreated + edgeResult.edgesUpdated;
    }
  }

  await changeActivities.markChangesProcessed({
    changeIds: changes.map((c) => c.id),
  });

  const remaining = await changeActivities.countUnprocessedChanges({
    teamId: input.teamId,
    connectorId: input.connectorId,
    syncHistoryId: input.syncHistoryId,
  });

  if (remaining > 0) {
    return continueAsNew<typeof processKnowledgeChangesWorkflow>({
      ...input,
      processedSoFar: (input.processedSoFar ?? 0) + changes.length,
    });
  }

  return {
    processed: changes.length + (input.processedSoFar ?? 0),
    entitiesUpdated,
    edgesUpdated,
  };
}
