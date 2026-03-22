import type {
  ClickUpSyncBatch,
  ClickUpSyncCursor,
  ClickUpSyncOptions,
  ClickUpTransformContext,
} from "@openbeam/types/services/connectors/clickup";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllListsInSpace } from "../api/lists";
import { getAllSpaces } from "../api/spaces";
import { getListTasks, getTaskComments } from "../api/tasks";
import type { ClickUpClient } from "../client";
import { transformTask } from "../transformers/task";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface IncrementalSyncOptions extends ClickUpSyncOptions {
  lastSyncTime: number;
}

export async function* incrementalSync(
  client: ClickUpClient,
  workspaceId: string,
  context: ClickUpTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<ClickUpSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    includeSpaces,
    excludeSpaces,
    onStageChange,
  } = options;

  logger.info(
    { lastSyncTime, workspaceId },
    "ClickUp incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  const cursor: ClickUpSyncCursor = {
    lastSyncTime: Date.now(),
    syncedSpaces: [],
  };

  await onStageChange?.("Checking for updated tasks", 0);

  for await (const space of getAllSpaces(client, workspaceId)) {
    if (includeSpaces?.length && !includeSpaces.includes(space.id)) {
      continue;
    }
    if (excludeSpaces?.length && excludeSpaces.includes(space.id)) {
      continue;
    }

    cursor.syncedSpaces?.push(space.id);

    for await (const list of getAllListsInSpace(client, space.id)) {
      if (list.archived) {
        continue;
      }

      await onStageChange?.(
        `Checking updated tasks: ${space.name}/${list.name}`,
        processed,
        list.name
      );

      for await (const task of getListTasks(client, list.id, {
        dateUpdatedGt: lastSyncTime,
      })) {
        try {
          const comments = syncComments
            ? await getTaskComments(client, task.id)
            : undefined;
          documents.push(await transformTask(task, context, comments));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped: 0,
              errors,
            });
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, taskId: task.id },
            "Error processing updated task"
          );
          errors += 1;
        }
      }
    }
  }

  logger.info(
    { processed, errors, documentsCount: documents.length },
    "ClickUp incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  }
}
