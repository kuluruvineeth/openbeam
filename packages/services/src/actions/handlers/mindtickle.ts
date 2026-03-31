import { createMission, updateContent } from "../../mindtickle/actions";
import {
  createMindtickleClient,
  type MindtickleClient,
} from "../../mindtickle/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MindtickleClient,
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
  async mission_create(client, p) {
    const r = await createMission(client, {
      name: str(p, "name"),
      description: str(p, "description"),
      mission_type: str(p, "mission_type"),
      due_date: typeof p.due_date === "string" ? p.due_date : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async content_update(client, p) {
    const r = await updateContent(client, {
      contentId: str(p, "contentId"),
      title: typeof p.title === "string" ? p.title : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      category: typeof p.category === "string" ? p.category : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "mindtickle",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Mindtickle action: ${actionId}`,
      };
    }

    const client = createMindtickleClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
