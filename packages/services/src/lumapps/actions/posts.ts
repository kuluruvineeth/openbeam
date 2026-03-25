import type { LumAppsClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreatePostParams {
  communityId: string;
  content: string;
}

export async function createPost(
  client: LumAppsClient,
  params: CreatePostParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{ id: string }>(
      `/communities/${params.communityId}/posts`,
      { content: params.content }
    );

    return {
      success: true,
      id: response.id,
      url: `https://sites.lumapps.com/community/${params.communityId}/post/${response.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}
