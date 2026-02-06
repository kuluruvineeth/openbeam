import type { Database } from "@openplane/db";
import { countUnprocessedChanges as countQuery } from "@openplane/db";
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
