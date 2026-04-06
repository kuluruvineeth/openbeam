import { createCard, updateCard } from "../../guru/actions";
import { createGuruClient, type GuruClient } from "../../guru/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GuruClient,
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
  async card_create(client, p) {
    const r = await createCard(client, {
      collectionId: str(p, "collectionId"),
      title: str(p, "title"),
      content: str(p, "content"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async card_update(client, p) {
    const r = await updateCard(client, {
      cardId: str(p, "cardId"),
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
  connectorType: "guru",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Guru action: ${actionId}`,
      };
    }

    const client = createGuruClient({
      connectorId: "",
      email: (credentials.config.email as string) ?? "",
      apiToken: (credentials.config.apiToken as string) ?? "",
    });

    return await handler(client, params);
  },
});
