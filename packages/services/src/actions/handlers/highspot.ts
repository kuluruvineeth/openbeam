import {
  createHighspotPitch,
  updateHighspotItemMetadata,
} from "../../highspot/actions";
import {
  createHighspotClient,
  type HighspotClient,
} from "../../highspot/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: HighspotClient,
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
  async item_update_metadata(client, p) {
    const r = await updateHighspotItemMetadata(
      client,
      str(p, "item_id"),
      (p.metadata as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { itemId: r.itemId, url: r.url } };
  },

  async pitch_create(client, p) {
    const r = await createHighspotPitch(client, {
      title: str(p, "title"),
      recipients: (p.recipients as { email: string; name?: string }[]) ?? [],
      item_ids: (p.item_ids as string[]) ?? [],
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { pitchId: r.pitchId, url: r.url } };
  },
};

registerHandler({
  connectorType: "highspot",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Highspot action: ${actionId}`,
      };
    }

    const client = createHighspotClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
