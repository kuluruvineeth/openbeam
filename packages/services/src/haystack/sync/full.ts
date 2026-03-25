import type {
  HaystackSyncBatch,
  HaystackSyncCursor,
  HaystackSyncOptions,
  HaystackTransformContext,
} from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listDepartments } from "../api/departments";
import { listLocations } from "../api/locations";
import { listPeople } from "../api/people";
import { listTeams } from "../api/teams";
import type { HaystackClient } from "../client";
import { transformDepartment } from "../transformers/department";
import { transformLocation } from "../transformers/location";
import { transformPerson } from "../transformers/person";
import { transformTeam } from "../transformers/team";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* haystackFullSync(
  client: HaystackClient,
  context: HaystackTransformContext,
  options: HaystackSyncOptions = {}
): AsyncGenerator<HaystackSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncTeams = true,
    syncDepartments = true,
    syncLocations = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncTeams,
      syncDepartments,
      syncLocations,
    },
    "Haystack full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: HaystackSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing people", state.processed);

  for await (const people of listPeople(client)) {
    for (const person of people) {
      try {
        state.documents.push(await transformPerson(person, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, personId: person.id },
          "Error transforming Haystack person"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncTeams) {
    await onStageChange?.("Syncing teams", state.processed);

    for await (const teams of listTeams(client)) {
      for (const team of teams) {
        try {
          state.documents.push(await transformTeam(team, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, teamId: team.id },
            "Error transforming Haystack team"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncDepartments) {
    await onStageChange?.("Syncing departments", state.processed);

    for await (const departments of listDepartments(client)) {
      for (const dept of departments) {
        try {
          state.documents.push(await transformDepartment(dept, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, departmentId: dept.id },
            "Error transforming Haystack department"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncLocations) {
    await onStageChange?.("Syncing locations", state.processed);

    for await (const locations of listLocations(client)) {
      for (const location of locations) {
        try {
          state.documents.push(await transformLocation(location, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, locationId: location.id },
            "Error transforming Haystack location"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Haystack full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
