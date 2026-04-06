import { createOrUpdateMarketoLead } from "../../marketo/actions";
import { createMarketoClient, type MarketoClient } from "../../marketo/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MarketoClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async lead_upsert(client, p) {
    const r = await createOrUpdateMarketoLead(
      client,
      p as Record<string, unknown>
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "marketo",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Marketo action: ${actionId}`,
      };
    }

    const client = createMarketoClient({
      connectorId: "",
      accessToken: credentials.accessToken,
      munchkinId: (credentials.config.munchkinId as string) ?? "",
    });

    return await handler(client, params);
  },
});
