import type { SimpplrClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface CreatePageParams {
  title: string;
  content: string;
  siteId: string;
}

interface UpdatePageParams {
  pageId: string;
  title?: string;
  content?: string;
}

export async function createPage(
  client: SimpplrClient,
  params: CreatePageParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      title: params.title,
      content: params.content,
      siteId: params.siteId,
    };

    const result = await client.post<{ id: string }>(
      `/sites/${params.siteId}/pages`,
      body
    );

    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updatePage(
  client: SimpplrClient,
  params: UpdatePageParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.title && { title: params.title }),
      ...(params.content && { content: params.content }),
    };

    await client.put<{ id: string }>(`/pages/${params.pageId}`, body);

    return { success: true, id: params.pageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}
