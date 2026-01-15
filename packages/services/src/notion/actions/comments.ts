import type { NotionComment } from "@openplane/types/services/connectors/notion";
import {
  createBlockComment as apiCreateBlockComment,
  createPageComment as apiCreatePageComment,
  getAllComments,
} from "../api/comments";
import type { NotionClient } from "../client";

export interface CommentActionResult {
  success: boolean;
  commentId?: string;
  error?: string;
}

export async function addPageComment(
  client: NotionClient,
  pageId: string,
  content: string
): Promise<CommentActionResult> {
  try {
    const comment = await apiCreatePageComment(client, pageId, content);

    return {
      success: true,
      commentId: comment.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

export async function addBlockComment(
  client: NotionClient,
  blockId: string,
  discussionId: string,
  content: string
): Promise<CommentActionResult> {
  try {
    const comment = await apiCreateBlockComment(
      client,
      blockId,
      discussionId,
      content
    );

    return {
      success: true,
      commentId: comment.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}

export async function listPageComments(
  client: NotionClient,
  pageId: string
): Promise<NotionComment[]> {
  try {
    return await getAllComments(client, { blockId: pageId });
  } catch {
    return [];
  }
}

export async function listBlockComments(
  client: NotionClient,
  blockId: string
): Promise<NotionComment[]> {
  try {
    return await getAllComments(client, { blockId });
  } catch {
    return [];
  }
}
