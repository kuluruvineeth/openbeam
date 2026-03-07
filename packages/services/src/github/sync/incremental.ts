import type {
  GitHubComment,
  GitHubSyncBatch,
  GitHubSyncCursor,
  GitHubSyncOptions,
  GitHubTransformContext,
} from "@openbeam/types/services/connectors/github";
import type { GenericDocument } from "@openbeam/vespa";
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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export interface IncrementalSyncOptions extends GitHubSyncOptions {
  lastSyncTime: number;
  onProgress?: (stats: {
    processed: number;
    skipped: number;
    errors: number;
  }) => void;
}

function parseRepoOwnerName(fullName: string): {
  owner: string;
  repo: string;
} {
  const [owner = "", repo = ""] = fullName.split("/");
  return { owner, repo };
}

async function collectIssueComments(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubComment[]> {
  const comments: GitHubComment[] = [];
  for await (const comment of getAllIssueComments(
    client,
    owner,
    repo,
    issueNumber
  )) {
    comments.push(comment);
  }
  return comments;
}

async function collectPRReviewComments(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubComment[]> {
  const comments: GitHubComment[] = [];
  for await (const comment of getAllPRReviewComments(
    client,
    owner,
    repo,
    prNumber
  )) {
    comments.push(comment);
  }
  return comments;
}

export async function* incrementalSync(
  client: GitHubClient,
  context: GitHubTransformContext,
  options: IncrementalSyncOptions
): AsyncGenerator<GitHubSyncBatch<GenericDocument>, void, undefined> {
  const {
    lastSyncTime,
    batchSize = DEFAULT_BATCH_SIZE,
    syncComments = true,
    syncPRs = true,
    syncDiscussions = false,
    syncCommits = false,
    onProgress,
    onStageChange,
  } = options;

  const since = new Date(lastSyncTime).toISOString();
  logger.info({ since }, "GitHub incremental sync started");

  await onStageChange?.("Loading user data", 0);
  const userLookup = await createUserLookup(client, context.organizationName);
  const enrichedContext = { ...context, userLookup };

  let documents: GenericDocument[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  const cursor: GitHubSyncCursor = {
    lastSyncTime: Date.now(),
    syncedRepos: [],
  };

  await onStageChange?.("Discovering repositories", 0);
  const repos: Array<{ full_name: string; isPrivate: boolean }> = [];
  for await (const repo of getAllRepos(client)) {
    repos.push({ full_name: repo.full_name, isPrivate: repo.private });
  }

  for (const repo of repos) {
    const { owner, repo: repoName } = parseRepoOwnerName(repo.full_name);
    cursor.syncedRepos?.push(repo.full_name);

    await onStageChange?.(
      `Checking updated issues: ${repo.full_name}`,
      processed
    );

    for await (const issue of getAllRepoIssues(
      client,
      owner,
      repoName,
      since
    )) {
      try {
        await onStageChange?.(
          `Processing updated issues: ${repo.full_name}`,
          processed,
          `#${issue.number}`
        );

        const comments = syncComments
          ? await collectIssueComments(client, owner, repoName, issue.number)
          : undefined;

        documents.push(
          await transformIssue(issue, enrichedContext, {
            repoFullName: repo.full_name,
            isRepoPrivate: repo.isPrivate,
            comments: comments?.length ? comments : undefined,
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
        logger.error(
          { error, issueId: issue.id },
          "Error processing GitHub issue"
        );
        errors += 1;
      }
    }

    if (syncPRs) {
      await onStageChange?.(
        `Checking updated PRs: ${repo.full_name}`,
        processed
      );

      for await (const pr of getAllRepoPullRequests(client, owner, repoName, {
        since,
      })) {
        try {
          await onStageChange?.(
            `Processing updated PRs: ${repo.full_name}`,
            processed,
            `#${pr.number}`
          );

          const reviews = await getPullRequestReviews(
            client,
            owner,
            repoName,
            pr.number
          );

          const prComments = syncComments
            ? await collectPRReviewComments(client, owner, repoName, pr.number)
            : undefined;

          documents.push(
            await transformPullRequest(pr, enrichedContext, {
              repoFullName: repo.full_name,
              isRepoPrivate: repo.isPrivate,
              reviews: reviews.length > 0 ? reviews : undefined,
              comments: prComments?.length ? prComments : undefined,
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
          logger.error(
            { error, prId: pr.id },
            "Error processing GitHub pull request"
          );
          errors += 1;
        }
      }
    }

    if (syncDiscussions) {
      await onStageChange?.(
        `Checking updated discussions: ${repo.full_name}`,
        processed
      );

      for await (const discussion of getAllRepoDiscussions(
        client,
        owner,
        repoName
      )) {
        if (new Date(discussion.updatedAt).getTime() < lastSyncTime) {
          skipped += 1;
          continue;
        }

        try {
          await onStageChange?.(
            `Processing updated discussions: ${repo.full_name}`,
            processed,
            discussion.title
          );

          documents.push(
            await transformDiscussion(discussion, enrichedContext, {
              repoFullName: repo.full_name,
              isRepoPrivate: repo.isPrivate,
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
          logger.error(
            { error, discussionId: discussion.id },
            "Error processing GitHub discussion"
          );
          errors += 1;
        }
      }
    }

    if (syncCommits) {
      await onStageChange?.(
        `Checking updated commits: ${repo.full_name}`,
        processed
      );

      for await (const commit of getAllRepoCommits(
        client,
        owner,
        repoName,
        since
      )) {
        try {
          await onStageChange?.(
            `Processing updated commits: ${repo.full_name}`,
            processed,
            commit.sha.slice(0, 7)
          );

          documents.push(
            await transformCommit(commit, enrichedContext, {
              repoFullName: repo.full_name,
              isRepoPrivate: repo.isPrivate,
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
          logger.error(
            { error, commitSha: commit.sha },
            "Error processing GitHub commit"
          );
          errors += 1;
        }
      }
    }
  }

  logger.info(
    { processed, errors, documentsCount: documents.length },
    "GitHub incremental sync complete"
  );

  if (documents.length > 0) {
    yield createSyncBatch(documents, cursor, false, {
      processed,
      skipped,
      errors,
    });
  }
}
