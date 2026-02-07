import type { Database } from "@openplane/db";
import { markChangesProcessed as markProcessedMutation } from "@openplane/db";
import type { MarkChangesProcessedInput } from "./types";

export interface MarkChangesProcessedDependencies {
  db: Database;
}

export function createMarkChangesProcessedActivity(
  deps: MarkChangesProcessedDependencies
) {
  return async function markChangesProcessed(
    input: MarkChangesProcessedInput
  ): Promise<void> {
    await markProcessedMutation(deps.db, input.changeIds);
  };
}
