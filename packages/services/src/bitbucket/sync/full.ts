import type {
  BitbucketRepository,
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
import { transformRepository } from "../transformers/repository";
import { transformSnippet } from "../transformers/snippet";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface FullSyncOptions extends BitbucketSyncOptions {
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
}

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function shouldSkipByTime(
  updatedAt: string,
  lookbackTime: number | undefined
): boolean {
  if (!lookbackTime) {
    return false;
  }
  return new Date(updatedAt).getTime() < lookbackTime;
}

export async function* fullSync(
  client: BitbucketClient,
  context: BitbucketTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<BitbucketSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncIssues = true,
    syncPullRequests = true,
    syncSnippets = false,
    lookbackDays,
    onProgress,
    onStageChange,
    onReposDiscovered,
  } = options;

  logger.info(
    { syncIssues, syncPullRequests, syncSnippets, lookbackDays },
    "Bitbucket full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };
  const cursor: BitbucketSyncCursor = {
    lastSyncTime: Date.now(),
    syncedRepos: [],
  };
  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Discovering repositories", 0);
  const repos: BitbucketRepository[] = [];
  for await (const repo of getAllRepos(client)) {
    repos.push(repo);
  }
  logger.info({ repoCount: repos.length }, "Repositories discovered");

  if (repos.length > 0) {
    await onReposDiscovered?.(repos);
  }

  for (const repo of repos) {
    cursor.syncedRepos?.push(repo.full_name);

    await onStageChange?.(
      `Syncing repository: ${repo.full_name}`,
      state.processed
    );

    try {
      state.documents.push(await transformRepository(repo, context));
      state.processed += 1;
    } catch (error) {
      logger.error(
        { error, repoId: repo.uuid },
        "Error transforming repository"
      );
      state.errors += 1;
    }

    if (syncPullRequests) {
      await onStageChange?.(
        `Syncing pull requests: ${repo.full_name}`,
        state.processed
      );

      try {
        for await (const pr of getAllPullRequests(client, repo.slug)) {
          if (shouldSkipByTime(pr.updated_on, lookbackTime)) {
            state.skipped += 1;
            continue;
          }

          try {
            const comments = await getPRComments(client, repo.slug, pr.id);

            state.documents.push(
              await transformPullRequest(pr, context, {
                repoFullName: repo.full_name,
                repoSlug: repo.slug,
                isPrivate: repo.is_private,
                comments: comments.length > 0 ? comments : undefined,
              })
            );
            state.processed += 1;
          } catch (error) {
            logger.error({ error, prId: pr.id }, "Error transforming PR");
            state.errors += 1;
          }

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
            onProgress?.(state);
          }
        }
      } catch (error) {
        logger.error(
          { error, repo: repo.full_name },
          "Error syncing pull requests"
        );
        state.errors += 1;
      }
    }

    if (syncIssues && repo.has_issues) {
      await onStageChange?.(
        `Syncing issues: ${repo.full_name}`,
        state.processed
      );

      try {
        for await (const issue of getAllIssues(client, repo.slug)) {
          if (shouldSkipByTime(issue.updated_on, lookbackTime)) {
            state.skipped += 1;
            continue;
          }

          try {
            const comments = await getIssueComments(
              client,
              repo.slug,
              issue.id
            );

            state.documents.push(
              await transformIssue(issue, context, {
                repoFullName: repo.full_name,
                repoSlug: repo.slug,
                isPrivate: repo.is_private,
                comments: comments.length > 0 ? comments : undefined,
              })
            );
            state.processed += 1;
          } catch (error) {
            logger.error(
              { error, issueId: issue.id },
              "Error transforming issue"
            );
            state.errors += 1;
          }

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
            onProgress?.(state);
          }
        }
      } catch (error) {
        logger.error({ error, repo: repo.full_name }, "Error syncing issues");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
      onProgress?.(state);
    }
  }

  if (syncSnippets) {
    await onStageChange?.("Syncing snippets", state.processed);

    try {
      for await (const snippet of getAllSnippets(client)) {
        if (shouldSkipByTime(snippet.updated_on, lookbackTime)) {
          state.skipped += 1;
          continue;
        }

        try {
          state.documents.push(await transformSnippet(snippet, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, snippetId: snippet.id },
            "Error transforming snippet"
          );
          state.errors += 1;
        }

        if (state.documents.length >= batchSize) {
          yield createSyncBatch(state.documents, cursor, true, state);
          state.documents = [];
          onProgress?.(state);
        }
      }
    } catch (error) {
      logger.error({ error }, "Error syncing snippets");
      state.errors += 1;
    }
  }

  logger.info(
    { ...state, documentsCount: state.documents.length },
    "Bitbucket full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
