import {
  addComment,
  createTask,
  listFolders,
  listLists,
  listSpaces,
  listWorkspaces,
  updateTask,
} from "../../clickup/actions";
import { type ClickUpClient, createClickUpClient } from "../../clickup/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: ClickUpClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async workspace_list(client) {
    const r = await listWorkspaces(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async space_list(client, p) {
    const r = await listSpaces(client, { teamId: str(p, "teamId") });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async folder_list(client, p) {
    const r = await listFolders(client, { spaceId: str(p, "spaceId") });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async list_list(client, p) {
    const spaceId = typeof p.spaceId === "string" ? p.spaceId : undefined;
    const folderId = typeof p.folderId === "string" ? p.folderId : undefined;
    if (!(spaceId || folderId)) {
      return {
        success: false,
        data: {},
        error: "Either spaceId or folderId is required",
      };
    }
    const r = await listLists(client, { spaceId, folderId });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async task_create(client, p) {
    const r = await createTask(client, {
      listId: str(p, "listId"),
      name: str(p, "name"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      assignees: Array.isArray(p.assignees)
        ? (p.assignees as number[])
        : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
      dueDate: typeof p.dueDate === "number" ? p.dueDate : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async task_update(client, p) {
    const r = await updateTask(client, {
      taskId: str(p, "taskId"),
      name: typeof p.name === "string" ? p.name : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "number" ? p.priority : undefined,
      status: typeof p.status === "string" ? p.status : undefined,
      dueDate: typeof p.dueDate === "number" ? p.dueDate : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async task_comment(client, p) {
    const r = await addComment(client, {
      taskId: str(p, "taskId"),
      commentText: str(p, "commentText"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "clickup",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported ClickUp action: ${actionId}`,
      };
    }

    const client = createClickUpClient({
      connectorId,
      accessToken: credentials.accessToken,
      workspaceId: (credentials.config.workspaceId as string) ?? "",
    });

    return await handler(client, params);
  },
});
