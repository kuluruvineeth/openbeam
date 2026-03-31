import { addComment } from "../../ironclad/actions/comments";
import {
  createWorkflow,
  updateWorkflow,
} from "../../ironclad/actions/workflows";
import {
  createIroncladClient,
  type IroncladClient,
} from "../../ironclad/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: IroncladClient,
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
  async workflow_create(client, p) {
    const r = await createWorkflow(client, {
      templateId: str(p, "templateId"),
      attributes:
        typeof p.attributes === "object" && p.attributes !== null
          ? (p.attributes as Record<string, unknown>)
          : {},
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async workflow_update(client, p) {
    const r = await updateWorkflow(client, {
      workflowId: str(p, "workflowId"),
      attributes:
        typeof p.attributes === "object" && p.attributes !== null
          ? (p.attributes as Record<string, unknown>)
          : {},
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async comment_add(client, p) {
    const r = await addComment(client, {
      workflowId: str(p, "workflowId"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "ironclad",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Ironclad action: ${actionId}`,
      };
    }

    const client = createIroncladClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
