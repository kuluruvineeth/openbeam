import type { AtlassianClient } from "../../atlassian/client";

export interface CommentActionResult {
  success: boolean;
  commentId?: string;
  error?: string;
}

type CreateCommentResponse = {
  id: string;
  self: string;
};

export async function addComment(
  client: AtlassianClient,
  issueIdOrKey: string,
  body: string
): Promise<CommentActionResult> {
  try {
    const result = await client.post<CreateCommentResponse>(
      `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/comment`,
      {
        body: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: body }],
            },
          ],
        },
      }
    );

    return { success: true, commentId: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
