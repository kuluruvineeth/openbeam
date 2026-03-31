import { createPage, updatePage } from "../../simpplr/actions";
import { createSimpplrClient, type SimpplrClient } from "../../simpplr/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SimpplrClient,
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
      siteId: typeof p.siteId === "string" ? p.siteId : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
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
  connectorType: "simpplr",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Simpplr action: ${actionId}`,
      };
    }

    const client = createSimpplrClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      baseUrl: (credentials.config.baseUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
