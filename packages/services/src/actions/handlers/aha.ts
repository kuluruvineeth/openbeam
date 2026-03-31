import { createFeature } from "../../aha/actions/features";
import { createIdea, updateIdea } from "../../aha/actions/ideas";
import { type AhaClient, createAhaClient } from "../../aha/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AhaClient,
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
  async feature_create(client, p) {
    const r = await createFeature(client, {
      productId: str(p, "productId"),
      name: str(p, "name"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      workflow_status:
        typeof p.workflow_status === "string" ? p.workflow_status : undefined,
      assigned_to_user:
        typeof p.assigned_to_user === "string" ? p.assigned_to_user : undefined,
      release: typeof p.release === "string" ? p.release : undefined,
      due_date: typeof p.due_date === "string" ? p.due_date : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async idea_create(client, p) {
    const r = await createIdea(client, {
      productId: str(p, "productId"),
      name: str(p, "name"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      workflow_status:
        typeof p.workflow_status === "string" ? p.workflow_status : undefined,
      assigned_to_user:
        typeof p.assigned_to_user === "string" ? p.assigned_to_user : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async idea_update(client, p) {
    const r = await updateIdea(client, {
      ideaId: str(p, "ideaId"),
      name: typeof p.name === "string" ? p.name : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      workflow_status:
        typeof p.workflow_status === "string" ? p.workflow_status : undefined,
      assigned_to_user:
        typeof p.assigned_to_user === "string" ? p.assigned_to_user : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "aha",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Aha action: ${actionId}`,
      };
    }

    const client = createAhaClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      subdomain: (credentials.config.subdomain as string) ?? "",
    });

    return await handler(client, params);
  },
});
