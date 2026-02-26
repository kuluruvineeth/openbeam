import {
  type GitHubRepository,
  GitHubRepositorySchema,
} from "@openplane/types/services/connectors/github";
import type { GitHubClient } from "../client";

export async function getRepos(
  client: GitHubClient,
  page = 1,
  perPage = 100
): Promise<{ repos: GitHubRepository[]; nextPage?: number }> {
  const repos = await client.get<unknown[]>("/user/repos", {
    type: "all",
    sort: "updated",
    direction: "desc",
    per_page: String(perPage),
    page: String(page),
  });

  const parsed = repos.map((r) => GitHubRepositorySchema.parse(r));
  const hasMore = parsed.length === perPage;

  return {
    repos: parsed,
    nextPage: hasMore ? page + 1 : undefined,
  };
}

export async function* getAllRepos(
  client: GitHubClient
): AsyncGenerator<GitHubRepository, void, undefined> {
  let page: number | undefined = 1;

  do {
    const { repos, nextPage } = await getRepos(client, page);
    for (const repo of repos) {
      yield repo;
    }
    page = nextPage;
  } while (page);
}
