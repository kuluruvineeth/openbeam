import type { AtlassianClient } from "../../atlassian/client";
import { createPageComment } from "../api/comments";

export interface CommentActionResult {
  success: boolean;
  commentId?: string;
  error?: string;
}

export async function addConfluenceComment(
  client: AtlassianClient,
  pageId: string,
  body: string
): Promise<CommentActionResult> {
  try {
    const comment = await createPageComment(client, {
      pageId,
      body: { representation: "storage", value: `<p>${body}</p>` },
    });

    return { success: true, commentId: comment.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
