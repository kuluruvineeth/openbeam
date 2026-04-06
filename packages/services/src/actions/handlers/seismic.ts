import { updateSeismicContentMetadata } from "../../seismic/actions";
import { createSeismicClient, type SeismicClient } from "../../seismic/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SeismicClient,
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
  async content_update_metadata(client, p) {
    const r = await updateSeismicContentMetadata(
      client,
      str(p, "content_id"),
      (p.metadata as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { contentId: r.contentId, url: r.url } };
  },
};

registerHandler({
  connectorType: "seismic",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Seismic action: ${actionId}`,
      };
    }

    const client = createSeismicClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
