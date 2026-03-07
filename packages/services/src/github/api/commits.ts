import {
  type GitHubCommit,
  GitHubCommitSchema,
} from "@openbeam/types/services/connectors/github";
import type { GitHubClient } from "../client";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export async function getRepoCommits(
  client: GitHubClient,
  owner: string,
  repo: string,
  options: { since?: string; page?: number; perPage?: number } = {}
): Promise<{ commits: GitHubCommit[]; nextPage?: number }> {
  const {
    since = new Date(Date.now() - NINETY_DAYS_MS).toISOString(),
    page = 1,
    perPage = 100,
  } = options;

  const raw = await client.get<unknown[]>(`/repos/${owner}/${repo}/commits`, {
    since,
    per_page: String(perPage),
    page: String(page),
  });

  const commits = raw.map((c) => GitHubCommitSchema.parse(c));
  const hasMore = commits.length === perPage;

  return {
    commits,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllRepoCommits(
  client: GitHubClient,
  owner: string,
  repo: string,
  since?: string
): AsyncGenerator<GitHubCommit, void, undefined> {
  const sinceDate =
    since ?? new Date(Date.now() - NINETY_DAYS_MS).toISOString();

  let page: number | undefined = 1;

  do {
    const { commits, nextPage } = await getRepoCommits(client, owner, repo, {
      since: sinceDate,
      page,
    });
    for (const commit of commits) {
      yield commit;
    }
    page = nextPage;
  } while (page);
}
