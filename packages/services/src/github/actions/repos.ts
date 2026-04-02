import type { GitHubClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface RepoResult extends ActionResult {
  repository?: {
    id: number;
    name: string;
    fullName: string;
    url: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    openIssues: number;
    defaultBranch: string;
  };
}

export async function getRepository(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<RepoResult> {
  try {
    const data = await client.get<{
      id: number;
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      default_branch: string;
    }>(`/repos/${owner}/${repo}`);

    return {
      success: true,
      repository: {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        url: data.html_url,
        description: data.description ?? "",
        language: data.language ?? "",
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get repo",
    };
  }
}
