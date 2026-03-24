import type { AhaClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateFeatureParams {
  productId: string;
  name: string;
  description?: string;
  workflow_status?: string;
  assigned_to_user?: string;
  release?: string;
  due_date?: string;
  tags?: string[];
}

export async function createFeature(
  client: AhaClient,
  params: CreateFeatureParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      feature: {
        name: params.name,
        ...(params.description && {
          description: params.description,
        }),
        ...(params.workflow_status && {
          workflow_status: params.workflow_status,
        }),
        ...(params.assigned_to_user && {
          assigned_to_user: params.assigned_to_user,
        }),
        ...(params.release && { release: params.release }),
        ...(params.due_date && { due_date: params.due_date }),
        ...(params.tags?.length && { tags: params.tags.join(",") }),
      },
    };

    const result = await client.post<{
      feature: { id: string; url: string };
    }>(`/products/${params.productId}/features`, body);

    return {
      success: true,
      id: result.feature.id,
      url: result.feature.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create feature",
    };
  }
}
