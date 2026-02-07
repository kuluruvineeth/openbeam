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

    const state: Record<string, unknown> = { ...input.checkpoint.state };
    if (input.memorySnapshot) {
      state._memorySnapshot = input.memorySnapshot;
    }
    if (input.contextWindow) {
      state._contextWindow = input.contextWindow;
    }

    await createBackgroundAgentCheckpoint(deps.db, input.sessionId, {
      version: nextVersion,
      state,
      stepIndex: input.checkpoint.step,
    });
  };
}
