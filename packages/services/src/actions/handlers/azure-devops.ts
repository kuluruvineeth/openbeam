import {
  addWorkItemComment,
  createWorkItem,
  updateWorkItem,
} from "../../azure-devops/actions";
import {
  type AzureDevOpsClient,
  createAzureDevOpsClient,
} from "../../azure-devops/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AzureDevOpsClient,
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
  async workitem_create(client, p) {
    const r = await createWorkItem(
      client,
      str(p, "project"),
      str(p, "workItemType"),
      {
        title: str(p, "title"),
        description:
          typeof p.description === "string" ? p.description : undefined,
        assignedTo: typeof p.assignedTo === "string" ? p.assignedTo : undefined,
        priority: typeof p.priority === "number" ? p.priority : undefined,
        tags: typeof p.tags === "string" ? p.tags : undefined,
      }
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async workitem_update(client, p) {
    const r = await updateWorkItem(
      client,
      str(p, "project"),
      typeof p.workItemId === "number"
        ? p.workItemId
        : Number(str(p, "workItemId")),
      {
        title: typeof p.title === "string" ? p.title : undefined,
        description:
          typeof p.description === "string" ? p.description : undefined,
        assignedTo: typeof p.assignedTo === "string" ? p.assignedTo : undefined,
        state: typeof p.state === "string" ? p.state : undefined,
        priority: typeof p.priority === "number" ? p.priority : undefined,
        tags: typeof p.tags === "string" ? p.tags : undefined,
      }
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async workitem_comment(client, p) {
    const r = await addWorkItemComment(
      client,
      str(p, "project"),
      typeof p.workItemId === "number"
        ? p.workItemId
        : Number(str(p, "workItemId")),
      str(p, "text")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "azure-devops",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, _connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Azure DevOps action: ${actionId}`,
      };
    }

    const client = createAzureDevOpsClient({
      connectorId: _connectorId,
      organization: (credentials.config.organization as string) ?? "",
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
