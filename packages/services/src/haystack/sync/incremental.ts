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
import { haystackFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* haystackIncrementalSync(
  client: HaystackClient,
  context: HaystackTransformContext,
  options: HaystackSyncOptions = {}
): AsyncGenerator<HaystackSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncTeams = true,
    syncDepartments = true,
    syncLocations = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* haystackFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Haystack incremental sync started"
  );

  const updatedAfter = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated people", processed);

    for await (const people of listPeople(client, { updatedAfter })) {
      for (const person of people) {
        try {
          documents.push(await transformPerson(person, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, personId: person.id },
            "Error transforming person in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    if (syncTeams) {
      await onStageChange?.("Syncing updated teams", processed);

      for await (const teams of listTeams(client, { updatedAfter })) {
        for (const team of teams) {
          try {
            documents.push(await transformTeam(team, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, teamId: team.id },
              "Error transforming team in incremental sync"
            );
            errors += 1;
          }
        }

        if (documents.length >= batchSize) {
          yield createSyncBatch(
            documents,
            {
              lastSyncTime: cursor.lastSyncTime,
              lastFullSync: cursor.lastFullSync,
            },
            true,
            { processed, skipped: 0, errors }
          );
          documents = [];
        }
      }
    }

    if (syncDepartments) {
      for await (const departments of listDepartments(client, {
        updatedAfter,
      })) {
        for (const dept of departments) {
          try {
            documents.push(await transformDepartment(dept, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, departmentId: dept.id },
              "Error transforming department in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncLocations) {
      for await (const locations of listLocations(client, {
        updatedAfter,
      })) {
        for (const location of locations) {
          try {
            documents.push(await transformLocation(location, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, locationId: location.id },
              "Error transforming location in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: HaystackSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Haystack incremental sync failed, falling back to full"
    );
    yield* haystackFullSync(client, context, options);
  }
}
