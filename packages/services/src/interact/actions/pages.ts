import type { InteractClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface CreatePageParams {
  title: string;
  summary: string;
  contentHtml: string;
  contentType: string;
  topSectionIds: number[];
  categoryIds: number[];
  pubStartDate: string;
  pubEndDate: string;
  authorId: number;
}

interface UpdatePageParams {
  pageId: string;
  title?: string;
  summary?: string;
  contentHtml?: string;
  transitionState: string;
  transitionMessage?: string;
}

interface ComposerResponse {
  Id: number;
}

export async function createPage(
  client: InteractClient,
  params: CreatePageParams
): Promise<ActionResult> {
  try {
    const body = {
      Title: params.title,
      Summary: params.summary,
      Content: { Html: params.contentHtml },
      ContentType: params.contentType,
      TopSectionIds: params.topSectionIds,
      CategoryIds: params.categoryIds,
      PubStartDate: params.pubStartDate,
      PubEndDate: params.pubEndDate,
      AuthorId: params.authorId,
    };

    const result = await client.post<ComposerResponse>("/page/composer", body);

    return { success: true, id: String(result.Id) };
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
      Transition: {
        State: params.transitionState,
        ...(params.transitionMessage && {
          Message: params.transitionMessage,
        }),
      },
    };

    if (params.title) {
      body.Title = params.title;
    }
    if (params.summary) {
      body.Summary = params.summary;
    }
    if (params.contentHtml) {
      body.Content = { Html: params.contentHtml };
    }

    await client.put<ComposerResponse>(`/page/${params.pageId}/composer`, body);

    return { success: true, id: params.pageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}
