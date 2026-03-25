import type { IroncladClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface AddCommentParams {
  workflowId: string;
  body: string;
}

export async function addComment(
  client: IroncladClient,
  params: AddCommentParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{ id: string }>(
      `/workflows/${params.workflowId}/comments`,
      { body: params.body }
    );

    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
