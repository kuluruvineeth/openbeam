import type { InsidedClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateIdeaParams {
  title: string;
  content: string;
  categoryId: string;
}

interface VoteIdeaParams {
  ideaId: string;
}

export async function createIdea(
  client: InsidedClient,
  params: CreateIdeaParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      data: { id: string; url: string };
    }>("/ideas", {
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
      error: error instanceof Error ? error.message : "Failed to create idea",
    };
  }
}

export async function voteIdea(
  client: InsidedClient,
  params: VoteIdeaParams
): Promise<ActionResult> {
  try {
    await client.post<{ data: { id: string } }>(
      `/ideas/${params.ideaId}/votes`,
      {}
    );

    return {
      success: true,
      id: params.ideaId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to vote on idea",
    };
  }
}
