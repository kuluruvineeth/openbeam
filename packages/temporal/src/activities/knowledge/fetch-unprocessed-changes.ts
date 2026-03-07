import type { Database, DocumentChange } from "@openbeam/db";
import { fetchUnprocessedChanges as fetchChangesQuery } from "@openbeam/db";
import type { FetchUnprocessedChangesInput } from "./types";

const DEFAULT_LIMIT = 1000;

export interface FetchUnprocessedChangesDependencies {
  db: Database;
}

export function createFetchUnprocessedChangesActivity(
  deps: FetchUnprocessedChangesDependencies
) {
  return function fetchUnprocessedChanges(
    input: FetchUnprocessedChangesInput
  ): Promise<DocumentChange[]> {
    return fetchChangesQuery(
      deps.db,
      {
        teamId: input.teamId,
        connectorId: input.connectorId,
        syncHistoryId: input.syncHistoryId,
      },
      {
        limit: input.limit ?? DEFAULT_LIMIT,
      }
    );
  };
}
