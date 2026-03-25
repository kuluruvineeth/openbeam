import type { LumAppsClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateContentParams {
  title: string;
  type: string;
  body?: string;
  spaceId?: string;
  tags?: string[];
  status?: string;
}

interface UpdateContentParams {
  contentId: string;
  title?: string;
  body?: string;
  tags?: string[];
  status?: string;
}

export async function createContent(
  client: LumAppsClient,
  params: CreateContentParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{ id: string }>("/contents", {
      title: params.title,
      type: params.type,
      ...(params.body && { body: params.body }),
      ...(params.spaceId && { spaceId: params.spaceId }),
      ...(params.tags?.length && { tags: params.tags }),
      ...(params.status && { status: params.status }),
    });

    return {
      success: true,
      id: response.id,
      url: `https://sites.lumapps.com/content/${response.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create content",
    };
  }
}

export async function updateContent(
  client: LumAppsClient,
  params: UpdateContentParams
): Promise<ActionResult> {
  try {
    await client.put(`/contents/${params.contentId}`, {
      ...(params.title && { title: params.title }),
      ...(params.body && { body: params.body }),
      ...(params.tags && { tags: params.tags }),
      ...(params.status && { status: params.status }),
    });

    return {
      success: true,
      id: params.contentId,
      url: `https://sites.lumapps.com/content/${params.contentId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update content",
    };
  }
}
