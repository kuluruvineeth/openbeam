import {
  createHubSpotRecord,
  updateHubSpotRecord,
} from "../../hubspot/actions";
import { createHubSpotClient, type HubSpotClient } from "../../hubspot/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: HubSpotClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async record_create(client, p) {
    const r = await createHubSpotRecord(client, str(p, "objectType"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async record_update(client, p) {
    const r = await updateHubSpotRecord(
      client,
      str(p, "objectType"),
      str(p, "recordId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "hubspot",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported HubSpot action: ${actionId}`,
      };
    }

    const client = createHubSpotClient({
      connectorId,
      accessToken: credentials.accessToken,
      portalId: (credentials.config.portalId as string) ?? "",
    });

    return await handler(client, params);
  },
});
