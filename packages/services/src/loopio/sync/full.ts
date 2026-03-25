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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* loopioFullSync(
  client: LoopioClient,
  context: LoopioTransformContext,
  options: LoopioSyncOptions = {}
): AsyncGenerator<LoopioSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info({ connectorId: client.connectorId }, "Loopio full sync started");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: LoopioSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing projects", state.processed);

  for await (const projects of listProjects(client)) {
    for (const project of projects) {
      try {
        state.documents.push(await transformProject(project, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, projectId: project.id },
          "Error transforming Loopio project"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing library entries", state.processed);

  for await (const entries of listLibraryEntries(client)) {
    for (const entry of entries) {
      try {
        state.documents.push(await transformLibraryEntry(entry, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, entryId: entry.id },
          "Error transforming Loopio library entry"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing tags", state.processed);

  for await (const tags of listTags(client)) {
    for (const tag of tags) {
      try {
        state.documents.push(await transformTag(tag, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, tagId: tag.id }, "Error transforming Loopio tag");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Loopio full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
