import { type Database, getBackgroundAgentCheckpoints } from "@openplane/db";
import type { LoadAgentContextInput } from "./types";

export interface LoadAgentContextDependencies {
  db: Database;
}

export function createLoadAgentContextActivity(
  deps: LoadAgentContextDependencies
) {
  return async function loadAgentContext(
    input: LoadAgentContextInput
  ): Promise<Record<string, unknown>> {
    const checkpoints = await getBackgroundAgentCheckpoints(
      deps.db,
      input.sessionId,
      1
    );

    if (checkpoints.length === 0) {
      return {};
    }

    return {};
  };
}
