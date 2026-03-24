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
import { benchlingFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* benchlingIncrementalSync(
  client: BenchlingClient,
  context: BenchlingTransformContext,
  options: BenchlingSyncOptions = {}
): AsyncGenerator<BenchlingSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncSequences = true,
    syncAssayResults = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* benchlingFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Benchling incremental sync started"
  );

  const modifiedAt = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated entries", processed);
    for await (const entries of listEntries(client, { modifiedAt })) {
      for (const entry of entries) {
        try {
          documents.push(await transformEntry(entry, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, entryId: entry.id },
            "Error transforming entry in incremental sync"
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

    await onStageChange?.("Syncing updated folders", processed);
    for await (const folders of listFolders(client, { modifiedAt })) {
      for (const folder of folders) {
        try {
          documents.push(await transformFolder(folder, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, folderId: folder.id },
            "Error transforming folder in incremental sync"
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

    await onStageChange?.("Syncing updated projects", processed);
    for await (const projects of listProjects(client, { modifiedAt })) {
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

    if (syncSequences) {
      for await (const sequences of listDnaSequences(client, { modifiedAt })) {
        for (const seq of sequences) {
          try {
            documents.push(await transformDnaSequence(seq, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, sequenceId: seq.id },
              "Error transforming DNA sequence in incremental sync"
            );
            errors += 1;
          }
        }
      }

      for await (const sequences of listAaSequences(client, { modifiedAt })) {
        for (const seq of sequences) {
          try {
            documents.push(await transformAaSequence(seq, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, sequenceId: seq.id },
              "Error transforming protein sequence in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncAssayResults) {
      for await (const results of listAssayResults(client, { modifiedAt })) {
        for (const result of results) {
          try {
            documents.push(await transformAssayResult(result, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, resultId: result.id },
              "Error transforming assay result in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: BenchlingSyncCursor = {
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
      "Benchling incremental sync failed, falling back to full"
    );
    yield* benchlingFullSync(client, context, options);
  }
}
