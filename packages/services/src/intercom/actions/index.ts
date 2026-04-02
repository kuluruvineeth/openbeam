import { createArticle, replyToConversation, tagConversation } from "../api";
import type { IntercomClient } from "../client";

export { listIntercomAdmins, listIntercomTags } from "./lookups";

export type ConversationActionResult = {
  success: boolean;
  conversationId?: string;
  error?: string;
};

export type ArticleActionResult = {
  success: boolean;
  articleId?: string;
  url?: string;
  error?: string;
};

export async function replyToIntercomConversation(
  client: IntercomClient,
  conversationId: string,
  body: string,
  adminId: string
): Promise<ConversationActionResult> {
  try {
    await replyToConversation(client, conversationId, body, adminId);
    return { success: true, conversationId };
  } catch (error) {
    return {
      success: false,
      conversationId,
      error: error instanceof Error ? error.message : "Reply failed",
    };
  }
}

export async function tagIntercomConversation(
  client: IntercomClient,
  conversationId: string,
  tagId: string,
  adminId: string
): Promise<ConversationActionResult> {
  try {
    await tagConversation(client, conversationId, tagId, adminId);
    return { success: true, conversationId };
  } catch (error) {
    return {
      success: false,
      conversationId,
      error: error instanceof Error ? error.message : "Tag failed",
    };
  }
}

export async function createIntercomArticle(
  client: IntercomClient,
  params: {
    title: string;
    body?: string;
    description?: string;
    state?: string;
    authorId?: number;
  }
): Promise<ArticleActionResult> {
  try {
    const article = await createArticle(client, {
      title: params.title,
      body: params.body,
      description: params.description,
      state: params.state ?? "draft",
      author_id: params.authorId,
    });
    return {
      success: true,
      articleId: article.id,
      url: article.url ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Article creation failed",
    };
  }
}
