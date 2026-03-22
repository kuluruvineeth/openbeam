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
import { transformList } from "../transformers/list";
import { transformTask } from "../transformers/task";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

function shouldIncludeSpace(
  spaceId: string,
  includeSpaces?: string[],
  excludeSpaces?: string[]
): boolean {
  if (includeSpaces?.length) {
    return includeSpaces.includes(spaceId);
  }
  if (excludeSpaces?.length) {
    return !excludeSpaces.includes(spaceId);
  }
  return true;
}

export async function* fullSync(
  client: ClickUpClient,
  workspaceId: string,
  context: ClickUpTransformContext,
  options: ClickUpSyncOptions = {}
): AsyncGenerator<ClickUpSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    lookbackDays,
    includeSpaces,
    excludeSpaces,
    onStageChange,
  } = options;

  logger.info(
    { syncComments, lookbackDays, workspaceId },
    "ClickUp full sync started"
  );

  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const cursor: ClickUpSyncCursor = {
    lastSyncTime: Date.now(),
    syncedSpaces: [],
  };

  await onStageChange?.("Discovering spaces", 0);
  const spaces: Array<{ id: string; name: string }> = [];
  for await (const space of getAllSpaces(client, workspaceId)) {
    if (shouldIncludeSpace(space.id, includeSpaces, excludeSpaces)) {
      spaces.push({ id: space.id, name: space.name });
    }
  }
  logger.info({ spaceCount: spaces.length }, "Spaces discovered");

  for (const space of spaces) {
    await onStageChange?.(`Syncing space: ${space.name}`, processed);
    cursor.syncedSpaces?.push(space.id);

    const lists: Array<{ id: string; name: string; spaceId: string }> = [];
    for await (const list of getAllListsInSpace(client, space.id)) {
      if (list.archived) {
        skipped += 1;
        continue;
      }

      try {
        documents.push(await transformList(list, context));
        processed += 1;
        lists.push({ id: list.id, name: list.name, spaceId: space.id });
      } catch (error) {
        logger.error({ error, listId: list.id }, "Error transforming list");
        errors += 1;
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(documents, cursor, true, {
          processed,
          skipped,
          errors,
        });
        documents = [];
      }
    }

    for (const list of lists) {
      await onStageChange?.(
        `Syncing tasks: ${space.name}/${list.name}`,
        processed,
        list.name
      );

      for await (const task of getListTasks(client, list.id)) {
        if (task.archived) {
          skipped += 1;
          continue;
        }

        if (lookbackTime && Number(task.date_updated) < lookbackTime) {
          skipped += 1;
          continue;
        }

        try {
          const comments = syncComments
            ? await getTaskComments(client, task.id)
            : undefined;
          documents.push(await transformTask(task, context, comments));
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped,
              errors,
            });
            documents = [];
          }
        } catch (error) {
          logger.error({ error, taskId: task.id }, "Error processing task");
          errors += 1;
        }
      }
    }
  }

  logger.info(
    { processed, skipped, errors, documentsCount: documents.length },
    "ClickUp full sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped,
      errors,
    });
  }
}
