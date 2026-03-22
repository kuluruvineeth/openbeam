import type { AsanaClient } from "../client";

export interface TaskActionResult {
  success: boolean;
  taskGid?: string;
  url?: string;
  error?: string;
}

type CreateTaskResponse = {
  data: { gid: string; permalink_url: string };
};

export async function createTask(
  client: AsanaClient,
  options: {
    workspaceGid: string;
    name: string;
    notes?: string;
    projectGid?: string;
    assigneeGid?: string;
    dueOn?: string;
  }
): Promise<TaskActionResult> {
  try {
    const taskData: Record<string, unknown> = {
      workspace: options.workspaceGid,
      name: options.name,
    };

    if (options.notes) {
      taskData.notes = options.notes;
    }
    if (options.projectGid) {
      taskData.projects = [options.projectGid];
    }
    if (options.assigneeGid) {
      taskData.assignee = options.assigneeGid;
    }
    if (options.dueOn) {
      taskData.due_on = options.dueOn;
    }

    const result = await client.post<CreateTaskResponse>("/tasks", {
      data: taskData,
    });

    return {
      success: true,
      taskGid: result.data.gid,
      url: result.data.permalink_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export async function updateTask(
  client: AsanaClient,
  taskGid: string,
  options: {
    name?: string;
    notes?: string;
    assigneeGid?: string;
    dueOn?: string;
    completed?: boolean;
  }
): Promise<TaskActionResult> {
  try {
    const taskData: Record<string, unknown> = {};

    if (options.name !== undefined) {
      taskData.name = options.name;
    }
    if (options.notes !== undefined) {
      taskData.notes = options.notes;
    }
    if (options.assigneeGid !== undefined) {
      taskData.assignee = options.assigneeGid;
    }
    if (options.dueOn !== undefined) {
      taskData.due_on = options.dueOn;
    }
    if (options.completed !== undefined) {
      taskData.completed = options.completed;
    }

    await client.put(`/tasks/${taskGid}`, { data: taskData });
    return { success: true, taskGid };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

export function completeTask(
  client: AsanaClient,
  taskGid: string
): Promise<TaskActionResult> {
  return updateTask(client, taskGid, { completed: true });
}

export async function addComment(
  client: AsanaClient,
  taskGid: string,
  text: string
): Promise<{ success: boolean; storyGid?: string; error?: string }> {
  try {
    const result = await client.post<{ data: { gid: string } }>(
      `/tasks/${taskGid}/stories`,
      { data: { text } }
    );

    return { success: true, storyGid: result.data.gid };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add comment",
    };
  }
}
