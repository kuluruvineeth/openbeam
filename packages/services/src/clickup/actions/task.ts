import type { ClickUpClient } from "../client";

interface CreateTaskParams {
  listId: string;
  name: string;
  description?: string;
  assignees?: number[];
  priority?: number;
  dueDate?: number;
  tags?: string[];
}

interface CreateTaskResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export async function createTask(
  client: ClickUpClient,
  params: CreateTaskParams
): Promise<CreateTaskResult> {
  try {
    const body: Record<string, unknown> = { name: params.name };

    if (params.description) {
      body.description = params.description;
    }
    if (params.assignees) {
      body.assignees = params.assignees;
    }
    if (params.priority !== undefined) {
      body.priority = params.priority;
    }
    if (params.dueDate) {
      body.due_date = params.dueDate;
    }
    if (params.tags) {
      body.tags = params.tags;
    }

    const result = await client.post<{ id: string; url: string }>(
      `/list/${params.listId}/task`,
      body
    );

    return { success: true, id: result.id, url: result.url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

interface UpdateTaskParams {
  taskId: string;
  name?: string;
  description?: string;
  assignees?: { add?: number[]; rem?: number[] };
  priority?: number;
  status?: string;
  dueDate?: number;
}

interface UpdateTaskResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function updateTask(
  client: ClickUpClient,
  params: UpdateTaskParams
): Promise<UpdateTaskResult> {
  try {
    const body: Record<string, unknown> = {};

    if (params.name) {
      body.name = params.name;
    }
    if (params.description) {
      body.description = params.description;
    }
    if (params.assignees) {
      body.assignees = params.assignees;
    }
    if (params.priority !== undefined) {
      body.priority = params.priority;
    }
    if (params.status) {
      body.status = params.status;
    }
    if (params.dueDate) {
      body.due_date = params.dueDate;
    }

    await client.put<unknown>(`/task/${params.taskId}`, body);

    return { success: true, id: params.taskId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

interface AddCommentParams {
  taskId: string;
  commentText: string;
}

interface AddCommentResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function addComment(
  client: ClickUpClient,
  params: AddCommentParams
): Promise<AddCommentResult> {
  try {
    const result = await client.post<{ id: string }>(
      `/task/${params.taskId}/comment`,
      { comment_text: params.commentText }
    );

    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
