import type {
  PipedriveSyncBatch,
  PipedriveSyncCursor,
  PipedriveTransformContext,
} from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllActivities } from "../api/activities";
import { listAllDeals } from "../api/deals";
import { listAllNotes } from "../api/notes";
import { listAllOrganizations } from "../api/organizations";
import { listAllPersons } from "../api/persons";
import type { PipedriveClient } from "../client";
import { transformPipedriveActivity } from "../transformers/activity";
import { transformPipedriveDeal } from "../transformers/deal";
import { transformPipedriveNote } from "../transformers/note";
import { transformPipedriveOrganization } from "../transformers/organization";
import { transformPipedrivePerson } from "../transformers/person";

export async function* pipedriveFullSync(
  client: PipedriveClient,
  context: PipedriveTransformContext,
  options: {
    batchSize?: number;
    syncActivities?: boolean;
    syncNotes?: boolean;
    syncOrganizations?: boolean;
    pipelineFilter?: number[];
  } = {}
): AsyncGenerator<PipedriveSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncActivities = options.syncActivities ?? true;
  const syncNotes = options.syncNotes ?? true;
  const syncOrganizations = options.syncOrganizations ?? true;
  const pipelineFilter = options.pipelineFilter ?? [];

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const deals of listAllDeals(client)) {
    for (const deal of deals) {
      if (
        pipelineFilter.length > 0 &&
        !pipelineFilter.includes(deal.pipeline_id)
      ) {
        continue;
      }
      try {
        documents.push(transformPipedriveDeal(deal, context));
        processed += 1;
        latestModified = trackModified(deal.update_time, latestModified);
      } catch (error) {
        logger.error(
          { error, dealId: deal.id },
          "Error transforming Pipedrive deal"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  for await (const persons of listAllPersons(client)) {
    for (const person of persons) {
      try {
        documents.push(transformPipedrivePerson(person, context));
        processed += 1;
        latestModified = trackModified(person.update_time, latestModified);
      } catch (error) {
        logger.error(
          { error, personId: person.id },
          "Error transforming Pipedrive person"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  if (syncOrganizations) {
    for await (const orgs of listAllOrganizations(client)) {
      for (const org of orgs) {
        try {
          documents.push(transformPipedriveOrganization(org, context));
          processed += 1;
          latestModified = trackModified(org.update_time, latestModified);
        } catch (error) {
          logger.error(
            { error, orgId: org.id },
            "Error transforming Pipedrive organization"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncActivities) {
    for await (const activities of listAllActivities(client)) {
      for (const activity of activities) {
        try {
          documents.push(transformPipedriveActivity(activity, context));
          processed += 1;
          latestModified = trackModified(activity.update_time, latestModified);
        } catch (error) {
          logger.error(
            { error, activityId: activity.id },
            "Error transforming Pipedrive activity"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncNotes) {
    for await (const notes of listAllNotes(client)) {
      for (const note of notes) {
        try {
          documents.push(transformPipedriveNote(note, context));
          processed += 1;
          latestModified = trackModified(note.update_time, latestModified);
        } catch (error) {
          logger.error(
            { error, noteId: note.id },
            "Error transforming Pipedrive note"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: PipedriveSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): PipedriveSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
