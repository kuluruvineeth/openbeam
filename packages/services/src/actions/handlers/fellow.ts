import { archiveActionItem, completeActionItem } from "../../fellow/actions";
import { createFellowClient, type FellowClient } from "../../fellow/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: FellowClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async action_item_complete(client, p) {
    const r = await completeActionItem(client, str(p, "actionItemId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async action_item_archive(client, p) {
    const r = await archiveActionItem(client, str(p, "actionItemId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "fellow",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Fellow action: ${actionId}`,
      };
    }

    const subdomain =
      typeof credentials.config.subdomain === "string"
        ? credentials.config.subdomain
        : "";
    if (!subdomain) {
      return {
        success: false,
        data: {},
        error:
          "Fellow subdomain is required in connector config (e.g. 'acme' for acme.fellow.app)",
      };
    }

    const client = createFellowClient({
      connectorId,
      apiKey: credentials.accessToken,
      subdomain,
    });

    return await handler(client, params);
  },
});
