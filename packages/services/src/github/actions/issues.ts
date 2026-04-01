import type { GitHubClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface IssueCreateResult extends ActionResult {
  issueNumber?: number;
  url?: string;
}

interface CommentResult extends ActionResult {
  commentId?: number;
  url?: string;
}

interface SearchResult extends ActionResult {
  items?: Array<{
    number: number;
    title: string;
    url: string;
    state: string;
  }>;
  totalCount?: number;
}

export async function createIssue(
  client: GitHubClient,
  owner: string,
  repo: string,
  params: { title: string; body?: string; labels?: string[] }
): Promise<IssueCreateResult> {
  try {
    const payload: Record<string, unknown> = { title: params.title };
    if (params.body) {
      payload.body = params.body;
    }
    if (params.labels?.length) {
      payload.labels = params.labels;
    }

    const data = await client.post<{ number: number; html_url: string }>(
      `/repos/${owner}/${repo}/issues`,
      payload
    );

    return { success: true, issueNumber: data.number, url: data.html_url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}

export async function addIssueComment(
  client: GitHubClient,
  params: { owner: string; repo: string; issueNumber: number; body: string }
): Promise<CommentResult> {
  try {
    const data = await client.post<{ id: number; html_url: string }>(
      `/repos/${params.owner}/${params.repo}/issues/${params.issueNumber}/comments`,
      { body: params.body }
    );

    return { success: true, commentId: data.id, url: data.html_url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

export async function searchIssues(
  client: GitHubClient,
  query: string,
  limit = 20
): Promise<SearchResult> {
  try {
    const data = await client.get<{
      total_count: number;
      items: Array<{
        number: number;
        title: string;
        html_url: string;
        state: string;
      }>;
    }>("/search/issues", { q: query, per_page: String(limit) });

    return {
      success: true,
      items: data.items.map((i) => ({
        number: i.number,
        title: i.title,
        url: i.html_url,
        state: i.state,
      })),
      totalCount: data.total_count,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}
