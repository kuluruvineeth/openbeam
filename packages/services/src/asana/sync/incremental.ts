import type {
  AsanaSyncBatch,
  AsanaSyncCursor,
  AsanaTransformContext,
} from "@openbeam/types/services/connectors/asana";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getTaskStories } from "../api/stories";
import { searchTasks } from "../api/tasks";
import type { AsanaClient } from "../client";
import { transformAsanaComment } from "../transformers/comment";
import { transformAsanaTask } from "../transformers/task";
import { asanaFullSync } from "./full";

export async function* asanaIncrementalSync(
  client: AsanaClient,
  context: AsanaTransformContext,
  options: {
    cursor?: AsanaSyncCursor;
    batchSize?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
    syncComments?: boolean;
    syncCompletedTasks?: boolean;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<AsanaSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50, syncComments = true } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* asanaFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncComments,
      syncCompletedTasks: options.syncCompletedTasks,
      lookbackDays: options.lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified: string | undefined = cursor.lastSyncTime;

  try {
    for await (const tasks of searchTasks(client, context.workspaceGid, {
      modifiedAfter: cursor.lastSyncTime,
      projectGids: options.includeProjects,
      sortBy: "modified_at",
    })) {
      for (const task of tasks) {
        try {
          const doc = transformAsanaTask(task, context);
          documents.push(doc);
          processed += 1;

          if (!latestModified || task.modified_at > latestModified) {
            latestModified = task.modified_at;
          }

          if (syncComments) {
            try {
              for await (const stories of getTaskStories(client, task.gid)) {
                for (const story of stories) {
                  if (story.created_at > cursor.lastSyncTime) {
                    const commentDoc = transformAsanaComment(
                      story,
                      task,
                      context
                    );
                    documents.push(commentDoc);
                    processed += 1;
                  }
                }
              }
            } catch (error) {
              logger.error(
                { error, taskGid: task.gid },
                "Error fetching Asana task comments (incremental)"
              );
              errors += 1;
            }
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestModified,
                lastFullSync: cursor.lastFullSync,
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, taskGid: task.gid },
            "Error transforming Asana task (incremental)"
          );
          errors += 1;
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Asana incremental sync failed, falling back to full"
    );
    yield* asanaFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncComments,
      syncCompletedTasks: options.syncCompletedTasks,
      lookbackDays: options.lookbackDays,
    });
  }
}
