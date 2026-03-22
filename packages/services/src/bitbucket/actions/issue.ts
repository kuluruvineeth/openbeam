import type { BitbucketClient } from "../client";

interface CreateIssueParams {
  repoSlug: string;
  title: string;
  content?: string;
  kind?: string;
  priority?: string;
}

interface ActionResult {
  success: boolean;
  id?: number;
  url?: string;
  error?: string;
}

export async function createIssue(
  client: BitbucketClient,
  params: CreateIssueParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      links?: { html?: { href: string } };
    }>(`/repositories/${client.workspace}/${params.repoSlug}/issues`, {
      title: params.title,
      content: params.content ? { raw: params.content } : undefined,
      kind: params.kind ?? "bug",
      priority: params.priority ?? "major",
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

interface AddIssueCommentParams {
  repoSlug: string;
  issueId: number;
  body: string;
}

export async function addIssueComment(
  client: BitbucketClient,
  params: AddIssueCommentParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      links?: { html?: { href: string } };
    }>(
      `/repositories/${client.workspace}/${params.repoSlug}/issues/${params.issueId}/comments`,
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
