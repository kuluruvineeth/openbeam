import type {
  AsanaSyncBatch,
  AsanaSyncCursor,
  AsanaTransformContext,
} from "@openbeam/types/services/connectors/asana";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getWorkspaceProjects } from "../api/projects";
import { getTaskStories } from "../api/stories";
import { getProjectTasks } from "../api/tasks";
import type { AsanaClient } from "../client";
import { transformAsanaComment } from "../transformers/comment";
import { transformAsanaProject } from "../transformers/project";
import { transformAsanaTask } from "../transformers/task";

export async function* asanaFullSync(
  client: AsanaClient,
  context: AsanaTransformContext,
  options: {
    batchSize?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
    syncComments?: boolean;
    syncCompletedTasks?: boolean;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<AsanaSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 50;
  const syncComments = options.syncComments ?? true;
  const syncCompletedTasks = options.syncCompletedTasks ?? false;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let latestModified: string | undefined;

  for await (const projects of getWorkspaceProjects(
    client,
    context.workspaceGid,
    { archived: false }
  )) {
    for (const project of projects) {
      try {
        const doc = transformAsanaProject(project, context);
        documents.push(doc);
        processed += 1;
      } catch (error) {
        logger.error(
          { error, projectGid: project.gid },
          "Error transforming Asana project"
        );
        errors += 1;
      }
    }
  }

  if (documents.length >= batchSize) {
    yield {
      items: documents,
      cursor: { lastFullSync: Date.now() } as AsanaSyncCursor,
      hasMore: true,
      stats: { processed, skipped, errors },
    };
    documents = [];
  }

  const projectGids = await collectProjectGids(
    client,
    context.workspaceGid,
    options
  );

  const completedSince = syncCompletedTasks ? undefined : "now";

  const lookbackDate = options.lookbackDays
    ? new Date(Date.now() - options.lookbackDays * 86_400_000).toISOString()
    : undefined;

  for (const projectGid of projectGids) {
    for await (const tasks of getProjectTasks(client, projectGid, {
      completedSince,
    })) {
      for (const task of tasks) {
        if (lookbackDate && task.modified_at < lookbackDate) {
          skipped += 1;
          continue;
        }

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
                  const commentDoc = transformAsanaComment(
                    story,
                    task,
                    context
                  );
                  documents.push(commentDoc);
                  processed += 1;
                }
              }
            } catch (error) {
              logger.error(
                { error, taskGid: task.gid },
                "Error fetching Asana task comments"
              );
              errors += 1;
            }
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestModified,
                lastFullSync: Date.now(),
              } as AsanaSyncCursor,
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error(
            { error, taskGid: task.gid },
            "Error transforming Asana task"
          );
          errors += 1;
        }
      }
    }
  }

  const cursor: AsanaSyncCursor = {
    lastSyncTime: latestModified,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

async function collectProjectGids(
  client: AsanaClient,
  workspaceGid: string,
  options: {
    includeProjects?: string[];
    excludeProjects?: string[];
  }
): Promise<string[]> {
  if (options.includeProjects?.length) {
    return options.includeProjects;
  }

  const excludeSet = new Set(options.excludeProjects ?? []);
  const gids: string[] = [];

  for await (const projects of getWorkspaceProjects(client, workspaceGid, {
    archived: false,
  })) {
    for (const project of projects) {
      if (!excludeSet.has(project.gid)) {
        gids.push(project.gid);
      }
    }
  }

  return gids;
}
