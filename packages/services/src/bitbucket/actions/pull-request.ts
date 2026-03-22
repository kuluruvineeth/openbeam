import type { BitbucketClient } from "../client";

interface CreatePRParams {
  repoSlug: string;
  title: string;
  sourceBranch: string;
  destinationBranch: string;
  description?: string;
}

interface ActionResult {
  success: boolean;
  id?: number;
  url?: string;
  error?: string;
}

export async function createPullRequest(
  client: BitbucketClient,
  params: CreatePRParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      links?: { html?: { href: string } };
    }>(`/repositories/${client.workspace}/${params.repoSlug}/pullrequests`, {
      title: params.title,
      description: params.description ?? "",
      source: { branch: { name: params.sourceBranch } },
      destination: { branch: { name: params.destinationBranch } },
      close_source_branch: false,
    });

    return {
      success: true,
      id: result.id,
      url: result.links?.html?.href,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface AddCommentParams {
  repoSlug: string;
  prId: number;
  body: string;
}

export async function addPRComment(
  client: BitbucketClient,
  params: AddCommentParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      links?: { html?: { href: string } };
    }>(
      `/repositories/${client.workspace}/${params.repoSlug}/pullrequests/${params.prId}/comments`,
      { content: { raw: params.body } }
    );

    return {
      success: true,
      id: result.id,
      url: result.links?.html?.href,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
