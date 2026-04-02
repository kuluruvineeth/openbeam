import type { LumAppsClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

type PostType = "DEFAULT" | "IDEA" | "QUESTION";

interface CreatePostParams {
  communityId: string;
  content: string;
  title?: string;
  postType?: PostType;
  language?: string;
}

interface PostSaveResponse {
  uid?: string;
  id?: string;
  externalKey?: string;
  canonicalUrl?: string;
}

export async function createPost(
  client: LumAppsClient,
  params: CreatePostParams
): Promise<ActionResult> {
  const lang = params.language ?? "en";

  const payload: Record<string, unknown> = {
    type: "post",
    postType: params.postType ?? "DEFAULT",
    externalKey: params.communityId,
    content: { [lang]: params.content },
  };

  if (params.title) {
    payload.title = { [lang]: params.title };
  }
  if (client.customerId) {
    payload.customer = client.customerId;
  }
  if (client.instanceId) {
    payload.instance = client.instanceId;
  }

  try {
    const response = await client.postV1<PostSaveResponse>(
      "/community/post/save",
      payload
    );

    const postId = response.uid ?? response.id ?? "";
    return {
      success: true,
      id: postId,
      url:
        response.canonicalUrl ??
        `https://sites.lumapps.com/community/${params.communityId}/post/${postId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}
