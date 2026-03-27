import { MemoryExtractionInputSchema } from "@openbeam/types/temporal/workflows/context";
import { proxyActivities } from "@temporalio/workflow";
import type { ContextEnrichmentActivities } from "../../activities/context/types";

const activities = proxyActivities<
  Pick<ContextEnrichmentActivities, "extractMemoriesFromSession">
>({
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

export async function memoryExtractionWorkflow(
  rawInput: unknown
): Promise<void> {
  const input = MemoryExtractionInputSchema.parse(rawInput);

  await activities.extractMemoriesFromSession({
    sessionId: input.sessionId,
    teamId: input.teamId,
    userId: input.userId,
    agentId: input.agentId,
  });
}
