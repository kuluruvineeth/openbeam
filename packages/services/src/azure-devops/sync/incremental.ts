import type {
  AzureDevOpsSyncBatch,
  AzureDevOpsSyncCursor,
  AzureDevOpsTransformContext,
} from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listProjects, queryWorkItems } from "../api";
import type { AzureDevOpsClient } from "../client";
import { transformWorkItem } from "../transformers";
import { azureDevOpsFullSync } from "./full";

export async function* azureDevOpsIncrementalSync(
  client: AzureDevOpsClient,
  context: AzureDevOpsTransformContext,
  options: {
    cursor?: AzureDevOpsSyncCursor;
    batchSize?: number;
    includeProjects?: string[];
    excludeProjects?: string[];
    syncRepos?: boolean;
    syncPullRequests?: boolean;
    syncWiki?: boolean;
    workItemTypes?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<AzureDevOpsSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 50 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* azureDevOpsFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncRepos: options.syncRepos,
      syncPullRequests: options.syncPullRequests,
      syncWiki: options.syncWiki,
      workItemTypes: options.workItemTypes,
      lookbackDays: options.lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestChanged: string | undefined = cursor.lastSyncTime;

  try {
    let projects = await listProjects(client);

    if (options.includeProjects?.length) {
      const include = new Set(
        options.includeProjects.map((p) => p.toLowerCase())
      );
      projects = projects.filter((p) => include.has(p.name.toLowerCase()));
    } else if (options.excludeProjects?.length) {
      const exclude = new Set(
        options.excludeProjects.map((p) => p.toLowerCase())
      );
      projects = projects.filter((p) => !exclude.has(p.name.toLowerCase()));
    }

    for (const project of projects) {
      for await (const batch of queryWorkItems(client, project.name, {
        changedSince: cursor.lastSyncTime,
        workItemTypes: options.workItemTypes,
      })) {
        for (const item of batch) {
          try {
            const doc = transformWorkItem(item, context);
            documents.push(doc);
            processed += 1;

            const changed = item.fields["System.ChangedDate"];
            if (!latestChanged || changed > latestChanged) {
              latestChanged = changed;
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  lastSyncTime: latestChanged,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, workItemId: item.id },
              "Error transforming Azure DevOps work item"
            );
            errors += 1;
          }
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestChanged,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Azure DevOps incremental sync failed, falling back to full"
    );
    yield* azureDevOpsFullSync(client, context, {
      batchSize,
      includeProjects: options.includeProjects,
      excludeProjects: options.excludeProjects,
      syncRepos: options.syncRepos,
      syncPullRequests: options.syncPullRequests,
      syncWiki: options.syncWiki,
      workItemTypes: options.workItemTypes,
      lookbackDays: options.lookbackDays,
    });
  }
}
