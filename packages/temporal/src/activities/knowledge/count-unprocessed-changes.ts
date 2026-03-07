import type { Database } from "@openbeam/db";
import { countUnprocessedChanges as countQuery } from "@openbeam/db";
import type { CountUnprocessedChangesInput } from "./types";

export interface CountUnprocessedChangesDependencies {
  db: Database;
}

export function createCountUnprocessedChangesActivity(
  deps: CountUnprocessedChangesDependencies
) {
  return function countUnprocessedChanges(
    input: CountUnprocessedChangesInput
  ): Promise<number> {
    return countQuery(deps.db, {
      teamId: input.teamId,
      connectorId: input.connectorId,
      syncHistoryId: input.syncHistoryId,
    });
  };
}
