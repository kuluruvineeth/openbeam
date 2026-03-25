import type { InteractClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface CreatePageParams {
  title: string;
  content: string;
  section?: string;
}

interface UpdatePageParams {
  pageId: string;
  title?: string;
  content?: string;
}

export async function createPage(
  client: InteractClient,
  params: CreatePageParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      Title: params.title,
      Content: params.content,
      ...(params.section && { Section: params.section }),
    };

    const result = await client.post<{ Id: string }>("/content/pages", body);

    return { success: true, id: result.Id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updatePage(
  client: InteractClient,
  params: UpdatePageParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.title && { Title: params.title }),
      ...(params.content && { Content: params.content }),
    };

    await client.put<{ Id: string }>(`/content/pages/${params.pageId}`, body);

    return { success: true, id: params.pageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}
