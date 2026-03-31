import { createPage, updatePage } from "../../interact/actions";
import {
  createInteractClient,
  type InteractClient,
} from "../../interact/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: InteractClient,
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
  async page_create(client, p) {
    const r = await createPage(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      section: typeof p.section === "string" ? p.section : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async page_update(client, p) {
    const r = await updatePage(client, {
      pageId: str(p, "pageId"),
      title: typeof p.title === "string" ? p.title : undefined,
      content: typeof p.content === "string" ? p.content : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "interact",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Interact action: ${actionId}`,
      };
    }

    const client = createInteractClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      baseUrl: (credentials.config.baseUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
