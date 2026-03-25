import type { MindtouchClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreatePageParams {
  parentPageId: string;
  title: string;
  content: string;
  tags?: string[];
}

interface UpdatePageContentParams {
  pageId: string;
  content: string;
}

interface AddPageTagsParams {
  pageId: string;
  tags: string[];
}

export async function createPage(
  client: MindtouchClient,
  params: CreatePageParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      "@id": string;
      "uri.ui": string;
    }>(`/pages/${params.parentPageId}/contents`, {
      title: params.title,
      body: [params.content],
    });

    if (params.tags?.length) {
      await addPageTags(client, {
        pageId: result["@id"],
        tags: params.tags,
      });
    }

    return {
      success: true,
      id: result["@id"],
      url: result["uri.ui"],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updatePageContent(
  client: MindtouchClient,
  params: UpdatePageContentParams
): Promise<ActionResult> {
  try {
    const result = await client.put<{
      "@id": string;
      "uri.ui": string;
    }>(`/pages/${params.pageId}/contents`, params.content);

    return {
      success: true,
      id: result["@id"],
      url: result["uri.ui"],
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update page content",
    };
  }
}

export async function addPageTags(
  client: MindtouchClient,
  params: AddPageTagsParams
): Promise<ActionResult> {
  try {
    const tagBody = {
      tags: {
        tag: params.tags.map((t) => ({ "@value": t })),
      },
    };

    await client.put<unknown>(`/pages/${params.pageId}/tags`, tagBody);

    return {
      success: true,
      id: params.pageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add tags",
    };
  }
}
