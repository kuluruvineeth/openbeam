import {
  createShowpadChannel,
  updateShowpadAssetMetadata,
} from "../../showpad/actions";
import { createShowpadClient, type ShowpadClient } from "../../showpad/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: ShowpadClient,
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
  async channel_create(client, p) {
    const r = await createShowpadChannel(
      client,
      str(p, "name"),
      typeof p.description === "string" ? p.description : undefined
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { channelId: r.channelId, url: r.url } };
  },

  async asset_update_metadata(client, p) {
    const metadata = (
      typeof p.metadata === "object" && p.metadata !== null ? p.metadata : {}
    ) as Record<string, string>;
    const r = await updateShowpadAssetMetadata(
      client,
      str(p, "assetId"),
      metadata
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { assetId: r.assetId, url: r.url } };
  },
};

registerHandler({
  connectorType: "showpad",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Showpad action: ${actionId}`,
      };
    }

    const client = createShowpadClient({
      connectorId,
      accessToken: credentials.accessToken,
      subdomain: (credentials.config.subdomain as string) ?? "",
    });

    return await handler(client, params);
  },
});
