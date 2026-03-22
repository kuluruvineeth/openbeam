import type {
  BitbucketSyncBatch,
  BitbucketSyncCursor,
  BitbucketSyncOptions,
  BitbucketTransformContext,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllIssues, getIssueComments } from "../api/issues";
import { getAllPullRequests, getPRComments } from "../api/pull-requests";
import { getAllRepos } from "../api/repos";
import { getAllSnippets } from "../api/snippets";
import type { BitbucketClient } from "../client";
import { transformIssue } from "../transformers/issue";
import { transformPullRequest } from "../transformers/pull-request";
import { transformSnippet } from "../transformers/snippet";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface IncrementalSyncOptions extends BitbucketSyncOptions {
  lastSyncTime: number;
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
}

export async function* incrementalSync(
  client: BitbucketClient,
  context: BitbucketTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<BitbucketSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncIssues = true,
    syncPullRequests = true,
    syncSnippets = false,
    onProgress,
    onStageChange,
  } = options;

  const since = new Date(lastSyncTime).toISOString();
  logger.info({ since }, "Bitbucket incremental sync started");

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  const cursor: BitbucketSyncCursor = {
    lastSyncTime: Date.now(),
    syncedRepos: [],
  };

  await onStageChange?.("Discovering repositories", 0);
  const repos: Array<{
    full_name: string;
    slug: string;
    isPrivate: boolean;
    hasIssues: boolean;
  }> = [];
  for await (const repo of getAllRepos(client)) {
    repos.push({
      full_name: repo.full_name,
      slug: repo.slug,
      isPrivate: repo.is_private,
      hasIssues: repo.has_issues ?? false,
    });
  }

  for (const repo of repos) {
    cursor.syncedRepos?.push(repo.full_name);

    if (syncPullRequests) {
      await onStageChange?.(
        `Checking updated PRs: ${repo.full_name}`,
        processed
      );

      for await (const pr of getAllPullRequests(client, repo.slug, since)) {
        try {
          const comments = await getPRComments(client, repo.slug, pr.id);

          documents.push(
            await transformPullRequest(pr, context, {
              repoFullName: repo.full_name,
              repoSlug: repo.slug,
              isPrivate: repo.isPrivate,
              comments: comments.length > 0 ? comments : undefined,
            })
          );
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped,
              errors,
            });
            documents = [];
            onProgress?.({ processed, skipped, errors });
          }
        } catch (error) {
          logger.error({ error, prId: pr.id }, "Error processing pull request");
          errors += 1;
        }
      }
    }

    if (syncIssues && repo.hasIssues) {
      await onStageChange?.(
        `Checking updated issues: ${repo.full_name}`,
        processed
      );

      for await (const issue of getAllIssues(client, repo.slug, since)) {
        try {
          const comments = await getIssueComments(client, repo.slug, issue.id);

          documents.push(
            await transformIssue(issue, context, {
              repoFullName: repo.full_name,
              repoSlug: repo.slug,
              isPrivate: repo.isPrivate,
              comments: comments.length > 0 ? comments : undefined,
            })
          );
          processed += 1;

          if (documents.length >= batchSize) {
            yield createSyncBatch(documents, cursor, true, {
              processed,
              skipped,
              errors,
            });
            documents = [];
            onProgress?.({ processed, skipped, errors });
          }
        } catch (error) {
          logger.error({ error, issueId: issue.id }, "Error processing issue");
          errors += 1;
        }
      }
    }
  }

  if (syncSnippets) {
    await onStageChange?.("Checking updated snippets", processed);

    for await (const snippet of getAllSnippets(client, since)) {
      try {
        documents.push(await transformSnippet(snippet, context));
        processed += 1;

        if (documents.length >= batchSize) {
          yield createSyncBatch(documents, cursor, true, {
            processed,
            skipped,
            errors,
          });
          documents = [];
          onProgress?.({ processed, skipped, errors });
        }
      } catch (error) {
        logger.error(
          { error, snippetId: snippet.id },
          "Error processing snippet"
        );
        errors += 1;
      }
    }
  }

  logger.info(
    { processed, errors, documentsCount: documents.length },
    "Bitbucket incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped,
      errors,
    });
  }
}
