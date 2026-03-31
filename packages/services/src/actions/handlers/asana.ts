import {
  addComment,
  completeTask,
  createTask,
  updateTask,
} from "../../asana/actions";
import { type AsanaClient, createAsanaClient } from "../../asana/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AsanaClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async task_create(client, p) {
    const r = await createTask(client, {
      workspaceGid: str(p, "workspace_gid"),
      name: str(p, "name"),
      notes: typeof p.notes === "string" ? p.notes : undefined,
      projectGid: typeof p.project_gid === "string" ? p.project_gid : undefined,
      assigneeGid:
        typeof p.assignee_gid === "string" ? p.assignee_gid : undefined,
      dueOn: typeof p.due_on === "string" ? p.due_on : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { taskGid: r.taskGid, url: r.url } };
  },

  async task_update(client, p) {
    const r = await updateTask(client, str(p, "task_gid"), {
      name: typeof p.name === "string" ? p.name : undefined,
      notes: typeof p.notes === "string" ? p.notes : undefined,
      assigneeGid:
        typeof p.assignee_gid === "string" ? p.assignee_gid : undefined,
      dueOn: typeof p.due_on === "string" ? p.due_on : undefined,
      completed: typeof p.completed === "boolean" ? p.completed : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { taskGid: r.taskGid } };
  },

  async task_complete(client, p) {
    const r = await completeTask(client, str(p, "task_gid"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { taskGid: r.taskGid } };
  },

  async task_comment(client, p) {
    const r = await addComment(client, str(p, "task_gid"), str(p, "text"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { storyGid: r.storyGid } };
  },
};

registerHandler({
  connectorType: "asana",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Asana action: ${actionId}`,
      };
    }

    const client = createAsanaClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
