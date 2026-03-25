import type {
  LoopioSyncBatch,
  LoopioSyncCursor,
  LoopioSyncOptions,
  LoopioTransformContext,
} from "@openbeam/types/services/connectors/loopio";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listLibraryEntries } from "../api/library-entries";
import { listProjects } from "../api/projects";
import { listTags } from "../api/tags";
import type { LoopioClient } from "../client";
import { transformLibraryEntry } from "../transformers/library-entry";
import { transformProject } from "../transformers/project";
import { transformTag } from "../transformers/tag";
import { loopioFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* loopioIncrementalSync(
  client: LoopioClient,
  context: LoopioTransformContext,
  options: LoopioSyncOptions = {}
): AsyncGenerator<LoopioSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* loopioFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Loopio incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated projects", processed);

    for await (const projects of listProjects(client, { updatedSince })) {
      for (const project of projects) {
        try {
          documents.push(await transformProject(project, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, projectId: project.id },
            "Error transforming project in incremental sync"
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

    await onStageChange?.("Syncing updated library entries", processed);

    for await (const entries of listLibraryEntries(client, {
      updatedSince,
    })) {
      for (const entry of entries) {
        try {
          documents.push(await transformLibraryEntry(entry, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, entryId: entry.id },
            "Error transforming library entry in incremental sync"
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

    await onStageChange?.("Syncing tags", processed);

    for await (const tags of listTags(client)) {
      for (const tag of tags) {
        try {
          documents.push(await transformTag(tag, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, tagId: tag.id },
            "Error transforming tag in incremental sync"
          );
          errors += 1;
        }
      }
    }

    const newCursor: LoopioSyncCursor = {
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
      "Loopio incremental sync failed, falling back to full"
    );
    yield* loopioFullSync(client, context, options);
  }
}
