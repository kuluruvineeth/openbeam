import type {
  GitHubComment,
  GitHubRepository,
  GitHubSyncBatch,
  GitHubSyncCursor,
  GitHubSyncOptions,
  GitHubTransformContext,
} from "@openplane/types/services/connectors/github";
import type { GenericDocument } from "@openplane/vespa";
import { logger } from "../../lib/logger";
import { getAllRepoCommits } from "../api/commits";
import { getAllRepoDiscussions } from "../api/discussions";
import { getAllIssueComments, getAllRepoIssues } from "../api/issues";
import {
  getAllPRReviewComments,
  getAllRepoPullRequests,
  getPullRequestReviews,
} from "../api/pull-requests";
import { getAllRepos } from "../api/repos";
import { createUserLookup } from "../api/users";
import type { GitHubClient } from "../client";
import { transformCommit } from "../transformers/commit";
import { transformDiscussion } from "../transformers/discussion";
import { transformIssue } from "../transformers/issue";
import { transformPullRequest } from "../transformers/pull-request";
import { transformRepository } from "../transformers/repository";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface FullSyncOptions extends GitHubSyncOptions {
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

interface RepoSyncParams {
  client: GitHubClient;
  context: GitHubTransformContext;
  owner: string;
  repoName: string;
  repoFullName: string;
  isRepoPrivate: boolean;
  syncComments: boolean;
  lookbackTime: number | undefined;
  onSkip?: () => void;
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

function parseRepoOwnerName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner = "", repo = ""] = fullName.split("/");
  return { owner, repo };
}

async function collectComments(
  client: GitHubClient,
  opts: { owner: string; repo: string; number: number; enabled: boolean }
): Promise<GitHubComment[] | undefined> {
  if (!opts.enabled) {
    return;
  }
  const comments: GitHubComment[] = [];
  for await (const comment of getAllIssueComments(
    client,
    opts.owner,
    opts.repo,
    opts.number
  )) {
    comments.push(comment);
  }
  return comments.length > 0 ? comments : undefined;
}

async function collectPRComments(
  client: GitHubClient,
  opts: { owner: string; repo: string; number: number; enabled: boolean }
): Promise<GitHubComment[] | undefined> {
  if (!opts.enabled) {
    return;
  }
  const comments: GitHubComment[] = [];
  for await (const comment of getAllPRReviewComments(
    client,
    opts.owner,
    opts.repo,
    opts.number
  )) {
    comments.push(comment);
  }
  return comments.length > 0 ? comments : undefined;
}

async function* syncRepoIssues(
  params: RepoSyncParams
): AsyncGenerator<GenericDocument> {
  const {
    client,
    context,
    owner,
    repoName,
    repoFullName,
    isRepoPrivate,
    syncComments,
    lookbackTime,
    onSkip,
  } = params;

  for await (const issue of getAllRepoIssues(client, owner, repoName)) {
    if (shouldSkipByTime(issue.updated_at, lookbackTime)) {
      onSkip?.();
      continue;
    }

    const comments = await collectComments(client, {
      owner,
      repo: repoName,
      number: issue.number,
      enabled: syncComments,
    });

    yield await transformIssue(issue, context, {
      repoFullName,
      isRepoPrivate,
      comments,
    });
  }
}

async function* syncRepoPullRequests(
  params: RepoSyncParams
): AsyncGenerator<GenericDocument> {
  const {
    client,
    context,
    owner,
    repoName,
    repoFullName,
    isRepoPrivate,
    syncComments,
    lookbackTime,
    onSkip,
  } = params;

  for await (const pr of getAllRepoPullRequests(client, owner, repoName)) {
    if (shouldSkipByTime(pr.updated_at, lookbackTime)) {
      onSkip?.();
      continue;
    }

    const reviews = await getPullRequestReviews(
      client,
      owner,
      repoName,
      pr.number
    );

    const comments = await collectPRComments(client, {
      owner,
      repo: repoName,
      number: pr.number,
      enabled: syncComments,
    });

    yield await transformPullRequest(pr, context, {
      repoFullName,
      isRepoPrivate,
      reviews: reviews.length > 0 ? reviews : undefined,
      comments,
    });
  }
}

async function* syncRepoDiscussions(
  params: Omit<RepoSyncParams, "syncComments">
): AsyncGenerator<GenericDocument> {
  const {
    client,
    context,
    owner,
    repoName,
    repoFullName,
    isRepoPrivate,
    lookbackTime,
    onSkip,
  } = params;

  for await (const discussion of getAllRepoDiscussions(
    client,
    owner,
    repoName
  )) {
    if (shouldSkipByTime(discussion.updatedAt, lookbackTime)) {
      onSkip?.();
      continue;
    }

    yield await transformDiscussion(discussion, context, {
      repoFullName,
      isRepoPrivate,
    });
  }
}

async function* syncRepoCommits(
  params: Omit<RepoSyncParams, "syncComments">
): AsyncGenerator<GenericDocument> {
  const {
    client,
    context,
    owner,
    repoName,
    repoFullName,
    isRepoPrivate,
    lookbackTime,
  } = params;

  const commitSince = lookbackTime
    ? new Date(lookbackTime).toISOString()
    : undefined;

  for await (const commit of getAllRepoCommits(
    client,
    owner,
    repoName,
    commitSince
  )) {
    yield await transformCommit(commit, context, {
      repoFullName,
      isRepoPrivate,
    });
  }
}

export async function* fullSync(
  client: GitHubClient,
  context: GitHubTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<GitHubSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    syncPRs = true,
    syncDiscussions = false,
    syncCommits = false,
    lookbackDays,
    onProgress,
    onStageChange,
    onReposDiscovered,
  } = options;

  logger.info(
    { syncComments, syncPRs, syncDiscussions, syncCommits, lookbackDays },
    "GitHub full sync started"
  );

  await onStageChange?.("Loading user data", 0);
  const userLookup = await createUserLookup(client, context.organizationName);
  const enrichedContext = { ...context, userLookup };
  logger.info({ userCount: userLookup.size }, "User lookup created");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };
  const cursor: GitHubSyncCursor = {
    lastSyncTime: Date.now(),
    syncedRepos: [],
  };
  const lookbackTime = lookbackDays
    ? Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    : undefined;

  await onStageChange?.("Discovering repositories", 0);
  const repos: GitHubRepository[] = [];
  for await (const repo of getAllRepos(client)) {
    repos.push(repo);
  }
  logger.info({ repoCount: repos.length }, "Repositories discovered");

  if (repos.length > 0) {
    await onReposDiscovered?.(repos);
  }

  for (const repo of repos) {
    const { owner, repo: repoName } = parseRepoOwnerName(repo.full_name);
    cursor.syncedRepos?.push(repo.full_name);

    await onStageChange?.(
      `Syncing repository: ${repo.full_name}`,
      state.processed
    );

    try {
      state.documents.push(await transformRepository(repo, enrichedContext));
      state.processed += 1;
    } catch (error) {
      logger.error({ error, repoId: repo.id }, "Error transforming repository");
      state.errors += 1;
    }

    const baseParams: RepoSyncParams = {
      client,
      context: enrichedContext,
      owner,
      repoName,
      repoFullName: repo.full_name,
      isRepoPrivate: repo.private,
      syncComments,
      lookbackTime,
      onSkip: () => {
        state.skipped += 1;
      },
    };

    const generators: Array<{
      label: string;
      gen: AsyncGenerator<GenericDocument>;
    }> = [
      {
        label: `issues: ${repo.full_name}`,
        gen: syncRepoIssues(baseParams),
      },
    ];

    if (syncPRs) {
      generators.push({
        label: `pull requests: ${repo.full_name}`,
        gen: syncRepoPullRequests(baseParams),
      });
    }

    if (syncDiscussions) {
      generators.push({
        label: `discussions: ${repo.full_name}`,
        gen: syncRepoDiscussions(baseParams),
      });
    }

    if (syncCommits) {
      generators.push({
        label: `commits: ${repo.full_name}`,
        gen: syncRepoCommits(baseParams),
      });
    }

    for (const { label, gen } of generators) {
      await onStageChange?.(`Syncing ${label}`, state.processed);

      try {
        for await (const document of gen) {
          state.documents.push(document);
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            yield createSyncBatch(state.documents, cursor, true, state);
            state.documents = [];
            onProgress?.(state);
          }
        }
      } catch (error) {
        logger.error({ error, stage: label }, "Error during sync stage");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
      onProgress?.(state);
    }
  }

  logger.info(
    { ...state, documentsCount: state.documents.length },
    "GitHub full sync complete"
  );

  if (state.documents.length > 0) {
    yield createSyncBatch(state.documents, cursor, false, state);
  }
}
