import type { KlueClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateIntelParams {
  title: string;
  content: string;
  source: string;
  source_url?: string;
  competitor_ids?: string[];
  tags?: string[];
}

interface UpdateIntelParams {
  intelId: string;
  title?: string;
  content?: string;
  source?: string;
  tags?: string[];
}

export async function createIntel(
  client: KlueClient,
  params: CreateIntelParams
): Promise<ActionResult> {
  try {
    const body = {
      intel: {
        title: params.title,
        content: params.content,
        source: params.source,
        ...(params.source_url && { source_url: params.source_url }),
        ...(params.competitor_ids?.length && {
          competitor_ids: params.competitor_ids,
        }),
        ...(params.tags?.length && { tags: params.tags }),
      },
    };

    const result = await client.post<{
      intel: { id: string };
    }>("/intel", body);

    return {
      success: true,
      id: result.intel.id,
      url: `https://app.klue.com/intel/${result.intel.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create intel",
    };
  }
}

export async function updateIntel(
  client: KlueClient,
  params: UpdateIntelParams
): Promise<ActionResult> {
  try {
    const body = {
      intel: {
        ...(params.title && { title: params.title }),
        ...(params.content && { content: params.content }),
        ...(params.source && { source: params.source }),
        ...(params.tags?.length && { tags: params.tags }),
      },
    };

    const result = await client.put<{
      intel: { id: string };
    }>(`/intel/${params.intelId}`, body);

    return {
      success: true,
      id: result.intel.id,
      url: `https://app.klue.com/intel/${result.intel.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update intel",
    };
  }
}
