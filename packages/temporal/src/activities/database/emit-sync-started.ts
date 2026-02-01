import { publishJobProgress } from "@openplane/redis";
import type { EmitSyncStartedInput } from "./types";

export function createEmitSyncStartedActivity() {
  return async function emitSyncStarted(
    input: EmitSyncStartedInput
  ): Promise<void> {
    await publishJobProgress(input.teamId, {
      id: input.workflowId,
      teamId: input.teamId,
      type: "sync",
      status: "running",
      connectorId: input.connectorId,
      connectorName: input.connectorName,
      progress: 0,
      currentPhase: "INITIALIZING",
      itemsTotal: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
      startedAt: new Date().toISOString(),
    });
  };
}
