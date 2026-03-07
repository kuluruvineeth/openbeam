import {
  type BackgroundAgentStatus,
  type Database,
  updateBackgroundAgentStatus,
} from "@openbeam/db";
import type { FinalizeAgentSessionInput } from "./types";

export interface FinalizeAgentSessionDependencies {
  db: Database;
}

export function createFinalizeAgentSessionActivity(
  deps: FinalizeAgentSessionDependencies
) {
  return async function finalizeAgentSession(
    input: FinalizeAgentSessionInput
  ): Promise<void> {
    await updateBackgroundAgentStatus(
      deps.db,
      input.sessionId,
      input.status as BackgroundAgentStatus,
      { completedAt: new Date() }
    );
  };
}
