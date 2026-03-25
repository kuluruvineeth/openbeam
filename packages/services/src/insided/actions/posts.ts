import type { InsidedClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreatePostParams {
  title: string;
  content: string;
  categoryId: string;
}

interface CreateReplyParams {
  postId: string;
  content: string;
}

export async function createPost(
  client: InsidedClient,
  params: CreatePostParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      data: { id: string; url: string };
    }>("/posts", {
      title: params.title,
      content: params.content,
      category_id: params.categoryId,
    });

    return {
      success: true,
      id: result.data.id,
      url: result.data.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}

export async function createReply(
  client: InsidedClient,
  params: CreateReplyParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      data: { id: string };
    }>(`/posts/${params.postId}/replies`, {
      content: params.content,
    });

    return {
      success: true,
      id: result.data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create reply",
    };
  }
}
