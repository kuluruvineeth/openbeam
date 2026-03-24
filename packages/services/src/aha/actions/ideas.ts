import type { AhaClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateIdeaParams {
  productId: string;
  name: string;
  description?: string;
  workflow_status?: string;
  assigned_to_user?: string;
  tags?: string[];
}

interface UpdateIdeaParams {
  ideaId: string;
  name?: string;
  description?: string;
  workflow_status?: string;
  assigned_to_user?: string;
}

export async function createIdea(
  client: AhaClient,
  params: CreateIdeaParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      idea: {
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
        ...(params.tags?.length && { tags: params.tags.join(",") }),
      },
    };

    const result = await client.post<{
      idea: { id: string; url: string };
    }>(`/products/${params.productId}/ideas`, body);

    return {
      success: true,
      id: result.idea.id,
      url: result.idea.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create idea",
    };
  }
}

export async function updateIdea(
  client: AhaClient,
  params: UpdateIdeaParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      idea: {
        ...(params.name && { name: params.name }),
        ...(params.description && {
          description: params.description,
        }),
        ...(params.workflow_status && {
          workflow_status: params.workflow_status,
        }),
        ...(params.assigned_to_user && {
          assigned_to_user: params.assigned_to_user,
        }),
      },
    };

    const result = await client.put<{
      idea: { id: string; url: string };
    }>(`/ideas/${params.ideaId}`, body);

    return {
      success: true,
      id: result.idea.id,
      url: result.idea.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update idea",
    };
  }
}
