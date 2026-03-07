import type { Database } from "@openbeam/db";
import { markChangesProcessed as markProcessedMutation } from "@openbeam/db";
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
