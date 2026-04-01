import type { GitHubClient } from "../client";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface PrCreateResult extends ActionResult {
  pullRequestNumber?: number;
  url?: string;
}

interface CommentResult extends ActionResult {
  commentId?: number;
}

export async function createPullRequest(
  client: GitHubClient,
  owner: string,
  repo: string,
  params: { title: string; head: string; base: string; body?: string }
): Promise<PrCreateResult> {
  try {
    const payload: Record<string, unknown> = {
      title: params.title,
      head: params.head,
      base: params.base,
    };
    if (params.body) {
      payload.body = params.body;
    }

    const data = await client.post<{ number: number; html_url: string }>(
      `/repos/${owner}/${repo}/pulls`,
      payload
    );

    return {
      success: true,
      pullRequestNumber: data.number,
      url: data.html_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create PR",
    };
  }
}

export async function addPullRequestComment(
  client: GitHubClient,
  params: { owner: string; repo: string; prNumber: number; body: string }
): Promise<CommentResult> {
  try {
    const data = await client.post<{ id: number }>(
      `/repos/${params.owner}/${params.repo}/issues/${params.prNumber}/comments`,
      { body: params.body }
    );

    return { success: true, commentId: data.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
