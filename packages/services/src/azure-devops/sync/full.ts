import type {
  AzureDevOpsSyncBatch,
  AzureDevOpsSyncCursor,
  AzureDevOpsTransformContext,
} from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  flattenWikiPages,
  getWikiPageContent,
  getWikiPageTree,
  listProjects,
  listPullRequests,
  listRepositories,
  listWikis,
  queryWorkItems,
} from "../api";
import type { AzureDevOpsClient } from "../client";
import {
  transformPullRequest,
  transformRepository,
  transformWikiPage,
  transformWorkItem,
} from "../transformers";

export async function* azureDevOpsFullSync(
  client: AzureDevOpsClient,
  context: AzureDevOpsTransformContext,
  options: {
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
  const batchSize = options.batchSize ?? 50;
  const syncRepos = options.syncRepos ?? true;
  const syncPRs = options.syncPullRequests ?? true;
  const syncWiki = options.syncWiki ?? false;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestChanged: string | undefined;

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
      workItemTypes: options.workItemTypes,
      lookbackDays: options.lookbackDays,
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
                lastFullSync: Date.now(),
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

    if (syncRepos) {
      try {
        const repos = await listRepositories(client, project.name);
        for (const repo of repos) {
          try {
            documents.push(transformRepository(repo, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, repoId: repo.id },
              "Error transforming Azure DevOps repository"
            );
            errors += 1;
          }
        }
      } catch (error) {
        logger.error(
          { error, project: project.name },
          "Error listing Azure DevOps repositories"
        );
        errors += 1;
      }
    }

    if (syncPRs) {
      try {
        for await (const prBatch of listPullRequests(client, project.name)) {
          for (const pr of prBatch) {
            try {
              documents.push(transformPullRequest(pr, context));
              processed += 1;
            } catch (error) {
              logger.error(
                { error, prId: pr.pullRequestId },
                "Error transforming Azure DevOps PR"
              );
              errors += 1;
            }
          }

          if (documents.length >= batchSize) {
            yield {
              items: documents,
              cursor: {
                lastSyncTime: latestChanged,
                lastFullSync: Date.now(),
              },
              hasMore: true,
              stats: { processed, skipped, errors },
            };
            documents = [];
          }
        }
      } catch (error) {
        logger.error(
          { error, project: project.name },
          "Error listing Azure DevOps pull requests"
        );
        errors += 1;
      }
    }

    if (syncWiki) {
      try {
        const wikis = await listWikis(client, project.name);
        for (const wiki of wikis) {
          try {
            const tree = await getWikiPageTree(client, project.name, wiki.id);
            const pages = flattenWikiPages(tree);

            for (const page of pages) {
              try {
                if (!page.content) {
                  const pageData = await getWikiPageContent(
                    client,
                    project.name,
                    wiki.id,
                    page.path
                  );
                  page.content =
                    typeof pageData === "string"
                      ? pageData
                      : JSON.stringify(pageData);
                }
                documents.push(
                  transformWikiPage(page, project.name, wiki.name, context)
                );
                processed += 1;
              } catch (error) {
                logger.error(
                  { error, pageId: page.id, path: page.path },
                  "Error transforming wiki page"
                );
                errors += 1;
              }
            }
          } catch (error) {
            logger.error(
              { error, wikiId: wiki.id },
              "Error fetching wiki page tree"
            );
            errors += 1;
          }
        }
      } catch (error) {
        logger.error(
          { error, project: project.name },
          "Error listing Azure DevOps wikis"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield {
        items: documents,
        cursor: { lastSyncTime: latestChanged, lastFullSync: Date.now() },
        hasMore: true,
        stats: { processed, skipped, errors },
      };
      documents = [];
    }
  }

  const cursor: AzureDevOpsSyncCursor = {
    lastSyncTime: latestChanged,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}
