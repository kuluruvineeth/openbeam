import {
  createBackgroundAgentCheckpoint,
  type Database,
  getBackgroundAgentCheckpoints,
} from "@openplane/db";
import type { SaveAgentCheckpointInput } from "./types";

export interface SaveAgentCheckpointDependencies {
  db: Database;
}

export function createSaveAgentCheckpointActivity(
  deps: SaveAgentCheckpointDependencies
) {
  return async function saveAgentCheckpoint(
    input: SaveAgentCheckpointInput
  ): Promise<void> {
    const existingCheckpoints = await getBackgroundAgentCheckpoints(
      deps.db,
      input.sessionId,
      1
    );
    const nextVersion = (existingCheckpoints[0]?.version ?? 0) + 1;

    await createBackgroundAgentCheckpoint(deps.db, input.sessionId, {
      version: nextVersion,
      state: input.checkpoint.state,
      stepIndex: input.checkpoint.step,
    });
  };
}
