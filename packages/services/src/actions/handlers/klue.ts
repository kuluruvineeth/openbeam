import { createIntel, updateIntel } from "../../klue/actions";
import { createKlueClient, type KlueClient } from "../../klue/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: KlueClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async intel_create(client, p) {
    const r = await createIntel(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      source: str(p, "source"),
      source_url: typeof p.source_url === "string" ? p.source_url : undefined,
      competitor_ids: Array.isArray(p.competitor_ids)
        ? (p.competitor_ids as string[])
        : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async intel_update(client, p) {
    const r = await updateIntel(client, {
      intelId: str(p, "intelId"),
      title: typeof p.title === "string" ? p.title : undefined,
      content: typeof p.content === "string" ? p.content : undefined,
      source: typeof p.source === "string" ? p.source : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "klue",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Klue action: ${actionId}`,
      };
    }

    const client = createKlueClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
