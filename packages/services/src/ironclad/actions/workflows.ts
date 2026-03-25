import type { IroncladClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateWorkflowParams {
  templateId: string;
  attributes: Record<string, unknown>;
}

interface UpdateWorkflowParams {
  workflowId: string;
  attributes: Record<string, unknown>;
}

export async function createWorkflow(
  client: IroncladClient,
  params: CreateWorkflowParams
): Promise<ActionResult> {
  try {
    const result = await client.post<{ id: string }>("/workflows", {
      template: params.templateId,
      attributes: params.attributes,
    });

    return {
      success: true,
      id: result.id,
      url: `https://ironcladapp.com/workflow/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create workflow",
    };
  }
}

export async function updateWorkflow(
  client: IroncladClient,
  params: UpdateWorkflowParams
): Promise<ActionResult> {
  try {
    const result = await client.patch<{ id: string }>(
      `/workflows/${params.workflowId}`,
      { attributes: params.attributes }
    );

    return {
      success: true,
      id: result.id,
      url: `https://ironcladapp.com/workflow/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update workflow",
    };
  }
}
