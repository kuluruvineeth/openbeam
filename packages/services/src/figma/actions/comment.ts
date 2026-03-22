import type { FigmaClient } from "../client";

export type CommentActionResult = {
  success: boolean;
  commentId?: string;
  error?: string;
};

type PostCommentResponse = {
  id: string;
  message: string;
};

export async function addComment(
  client: FigmaClient,
  fileKey: string,
  message: string,
  parentId?: string
): Promise<CommentActionResult> {
  try {
    const body: Record<string, unknown> = { message };
    if (parentId) {
      body.comment_id = parentId;
    }

    const res = await client.post<PostCommentResponse>(
      `/files/${fileKey}/comments`,
      body
    );

    return { success: true, commentId: res.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
