import type {
  BenchlingSyncBatch,
  BenchlingSyncCursor,
  BenchlingSyncOptions,
  BenchlingTransformContext,
} from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAssayResults } from "../api/assay-results";
import { listEntries } from "../api/entries";
import { listFolders } from "../api/folders";
import { listProjects } from "../api/projects";
import { listAaSequences, listDnaSequences } from "../api/sequences";
import type { BenchlingClient } from "../client";
import { transformAssayResult } from "../transformers/assay-result";
import { transformEntry } from "../transformers/entry";
import { transformFolder } from "../transformers/folder";
import { transformProject } from "../transformers/project";
import {
  transformAaSequence,
  transformDnaSequence,
} from "../transformers/sequence";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* benchlingFullSync(
  client: BenchlingClient,
  context: BenchlingTransformContext,
  options: BenchlingSyncOptions = {}
): AsyncGenerator<BenchlingSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncSequences = true,
    syncAssayResults = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncSequences,
      syncAssayResults,
    },
    "Benchling full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: BenchlingSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing entries", state.processed);
  for await (const entries of listEntries(client)) {
    for (const entry of entries) {
      try {
        state.documents.push(await transformEntry(entry, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, entryId: entry.id }, "Error transforming entry");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing folders", state.processed);
  for await (const folders of listFolders(client)) {
    for (const folder of folders) {
      try {
        state.documents.push(await transformFolder(folder, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, folderId: folder.id },
          "Error transforming folder"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing projects", state.processed);
  for await (const projects of listProjects(client)) {
    for (const project of projects) {
      try {
        state.documents.push(await transformProject(project, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, projectId: project.id },
          "Error transforming project"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncSequences) {
    await onStageChange?.("Syncing DNA sequences", state.processed);
    for await (const sequences of listDnaSequences(client)) {
      for (const seq of sequences) {
        try {
          state.documents.push(await transformDnaSequence(seq, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, sequenceId: seq.id },
            "Error transforming DNA sequence"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }

    await onStageChange?.("Syncing protein sequences", state.processed);
    for await (const sequences of listAaSequences(client)) {
      for (const seq of sequences) {
        try {
          state.documents.push(await transformAaSequence(seq, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, sequenceId: seq.id },
            "Error transforming protein sequence"
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

  if (syncAssayResults) {
    await onStageChange?.("Syncing assay results", state.processed);
    for await (const results of listAssayResults(client)) {
      for (const result of results) {
        try {
          state.documents.push(await transformAssayResult(result, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, resultId: result.id },
            "Error transforming assay result"
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
    "Benchling full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
