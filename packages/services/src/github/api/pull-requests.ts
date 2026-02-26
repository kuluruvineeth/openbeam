import {
  type GitHubComment,
  GitHubCommentSchema,
  type GitHubPullRequest,
  GitHubPullRequestSchema,
  type GitHubReview,
  GitHubReviewSchema,
} from "@openplane/types/services/connectors/github";
import type { GitHubClient } from "../client";

export async function getRepoPullRequests(
  client: GitHubClient,
  owner: string,
  repo: string,
  options: {
    state?: string;
    sort?: string;
    page?: number;
    perPage?: number;
  } = {}
): Promise<{ pullRequests: GitHubPullRequest[]; nextPage?: number }> {
  const { state = "all", sort = "updated", page = 1, perPage = 100 } = options;

  const raw = await client.get<unknown[]>(`/repos/${owner}/${repo}/pulls`, {
    state,
    sort,
    direction: "desc",
    per_page: String(perPage),
    page: String(page),
  });

  const pullRequests = raw.map((pr) => GitHubPullRequestSchema.parse(pr));
  const hasMore = raw.length === perPage;

  return {
    pullRequests,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllRepoPullRequests(
  client: GitHubClient,
  owner: string,
  repo: string,
  filter?: { since?: string }
): AsyncGenerator<GitHubPullRequest, void, undefined> {
  let page: number | undefined = 1;
  const sinceTime = filter?.since
    ? new Date(filter.since).getTime()
    : undefined;

  do {
    const { pullRequests, nextPage } = await getRepoPullRequests(
      client,
      owner,
      repo,
      { page }
    );
    for (const pr of pullRequests) {
      if (sinceTime && new Date(pr.updated_at).getTime() < sinceTime) {
        return;
      }
      yield pr;
    }
    page = nextPage;
  } while (page);
}

export async function getPullRequestReviews(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubReview[]> {
  const raw = await client.get<unknown[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    { per_page: "100" }
  );

  return raw.map((r) => GitHubReviewSchema.parse(r));
}

export async function getPullRequestComments(
  client: GitHubClient,
  params: {
    owner: string;
    repo: string;
    prNumber: number;
    page?: number;
    perPage?: number;
  }
): Promise<{ comments: GitHubComment[]; nextPage?: number }> {
  const { owner, repo, prNumber, page = 1, perPage = 100 } = params;

  const raw = await client.get<unknown[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
    { per_page: String(perPage), page: String(page) }
  );

  const comments = raw.map((c) => GitHubCommentSchema.parse(c));
  const hasMore = comments.length === perPage;

  return {
    comments,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllPRReviewComments(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): AsyncGenerator<GitHubComment, void, undefined> {
  let page: number | undefined = 1;

  do {
    const { comments, nextPage } = await getPullRequestComments(client, {
      owner,
      repo,
      prNumber,
      page,
    });
    for (const comment of comments) {
      yield comment;
    }
    page = nextPage;
  } while (page);
}
