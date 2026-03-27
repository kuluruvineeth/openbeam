import { ContextEnrichmentInputSchema } from "@openbeam/types/temporal/workflows/context";
import {
  continueAsNew,
  proxyActivities,
  workflowInfo,
} from "@temporalio/workflow";
import type { ContextEnrichmentActivities } from "../../activities/context/types";

const activities = proxyActivities<ContextEnrichmentActivities>({
  startToCloseTimeout: "5 minutes",
  heartbeatTimeout: "60s",
  retry: {
    initialInterval: "2s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: "1m",
    nonRetryableErrorTypes: ["AuthorizationError", "ConfigError"],
  },
});

const HISTORY_LIMIT = 500;

export async function contextEnrichmentWorkflow(
  rawInput: unknown
): Promise<void> {
  const input = ContextEnrichmentInputSchema.parse(rawInput);

  const { abstract } = await activities.generateL0Abstract({
    uri: input.uri,
    content: input.content,
    contextType: input.contextType,
  });

  const { overview } = await activities.generateL1Overview({
    uri: input.uri,
    content: input.content,
    contextType: input.contextType,
  });

  await activities.embedContextEntry({
    uri: input.uri,
    teamId: input.teamId,
    abstractText: abstract,
    overview,
  });

  if (workflowInfo().historyLength > HISTORY_LIMIT) {
    await continueAsNew<typeof contextEnrichmentWorkflow>(rawInput);
  }
}
