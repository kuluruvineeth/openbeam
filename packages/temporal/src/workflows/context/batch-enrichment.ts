import { BatchEnrichmentInputSchema } from "@openbeam/types/temporal/workflows/context";
import {
  continueAsNew,
  proxyActivities,
  workflowInfo,
} from "@temporalio/workflow";
import type { ContextEnrichmentActivities } from "../../activities/context/types";

const activities = proxyActivities<
  Pick<ContextEnrichmentActivities, "generateL0Abstract">
>({
  startToCloseTimeout: "10 minutes",
  heartbeatTimeout: "120s",
  retry: {
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: "2m",
    nonRetryableErrorTypes: ["AuthorizationError", "ConfigError"],
  },
});

const HISTORY_LIMIT = 500;
const BATCH_SIZE = 20;

export async function batchContextEnrichmentWorkflow(
  rawInput: unknown
): Promise<{ enriched: number }> {
  const input = BatchEnrichmentInputSchema.parse(rawInput);
  let enriched = 0;

  for (let i = 0; i < input.uris.length; i += BATCH_SIZE) {
    const batch = input.uris.slice(i, i + BATCH_SIZE);

    for (const uri of batch) {
      await activities.generateL0Abstract({
        uri,
        content: "",
        contextType: "resource",
      });
      enriched += 1;
    }

    if (workflowInfo().historyLength > HISTORY_LIMIT) {
      const remaining = input.uris.slice(i + BATCH_SIZE);
      if (remaining.length > 0) {
        return continueAsNew<typeof batchContextEnrichmentWorkflow>({
          teamId: input.teamId,
          uris: remaining,
        });
      }
    }
  }

  return { enriched };
}
