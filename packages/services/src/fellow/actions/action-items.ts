import type { FellowClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateActionItemParams {
  title: string;
  description?: string;
  assignee_email?: string;
  due_date?: string;
  meeting_id?: string;
}

interface UpdateActionItemParams {
  actionItemId: string;
  title?: string;
  description?: string;
  completed?: boolean;
  due_date?: string;
}

export async function createActionItem(
  client: FellowClient,
  params: CreateActionItemParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      title: params.title,
      ...(params.description && { description: params.description }),
      ...(params.assignee_email && {
        assignee: { email: params.assignee_email },
      }),
      ...(params.due_date && { due_date: params.due_date }),
      ...(params.meeting_id && { meeting_id: params.meeting_id }),
    };

    const result = await client.post<{
      id: string;
      url: string;
    }>("/action-items", body);

    return {
      success: true,
      id: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create action item",
    };
  }
}

export async function updateActionItem(
  client: FellowClient,
  params: UpdateActionItemParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.completed !== undefined && { completed: params.completed }),
      ...(params.due_date && { due_date: params.due_date }),
    };

    const result = await client.put<{
      id: string;
      url: string;
    }>(`/action-items/${params.actionItemId}`, body);

    return {
      success: true,
      id: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update action item",
    };
  }
}
