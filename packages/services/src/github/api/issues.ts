import {
  type GitHubComment,
  GitHubCommentSchema,
  type GitHubIssue,
  GitHubIssueSchema,
} from "@openbeam/types/services/connectors/github";
import type { GitHubClient } from "../client";

export async function getRepoIssues(
  client: GitHubClient,
  owner: string,
  repo: string,
  options: {
    state?: string;
    since?: string;
    page?: number;
    perPage?: number;
  } = {}
): Promise<{ issues: GitHubIssue[]; nextPage?: number }> {
  const { state = "all", since, page = 1, perPage = 100 } = options;

  const query: Record<string, string> = {
    state,
    sort: "updated",
    direction: "desc",
    per_page: String(perPage),
    page: String(page),
  };
  if (since) {
    query.since = since;
  }

  const raw = await client.get<unknown[]>(
    `/repos/${owner}/${repo}/issues`,
    query
  );

  const issues = raw
    .map((item) => GitHubIssueSchema.parse(item))
    .filter((issue) => !issue.pull_request);

  const hasMore = raw.length === perPage;

  return {
    issues,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllRepoIssues(
  client: GitHubClient,
  owner: string,
  repo: string,
  since?: string
): AsyncGenerator<GitHubIssue, void, undefined> {
  let page: number | undefined = 1;

  do {
    const { issues, nextPage } = await getRepoIssues(client, owner, repo, {
      since,
      page,
    });
    for (const issue of issues) {
      yield issue;
    }
    page = nextPage;
  } while (page);
}

export async function getIssueComments(
  client: GitHubClient,
  params: {
    owner: string;
    repo: string;
    issueNumber: number;
    page?: number;
    perPage?: number;
  }
): Promise<{ comments: GitHubComment[]; nextPage?: number }> {
  const { owner, repo, issueNumber, page = 1, perPage = 100 } = params;

  const raw = await client.get<unknown[]>(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { per_page: String(perPage), page: String(page) }
  );

  const comments = raw.map((c) => GitHubCommentSchema.parse(c));
  const hasMore = comments.length === perPage;

  return {
    comments,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllIssueComments(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number
): AsyncGenerator<GitHubComment, void, undefined> {
  let page: number | undefined = 1;

  do {
    const { comments, nextPage } = await getIssueComments(client, {
      owner,
      repo,
      issueNumber,
      page,
    });
    for (const comment of comments) {
      yield comment;
    }
    page = nextPage;
  } while (page);
}
