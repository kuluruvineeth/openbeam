import {
  createSalesforceRecord,
  updateSalesforceRecord,
} from "../../salesforce/actions";
import {
  createSalesforceClient,
  type SalesforceClient,
} from "../../salesforce/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: SalesforceClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.fields === "object" && p.fields !== null ? p.fields : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async record_create(client, p) {
    const r = await createSalesforceRecord(client, str(p, "sobject"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async record_update(client, p) {
    const r = await updateSalesforceRecord(
      client,
      str(p, "sobject"),
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
  connectorType: "salesforce",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Salesforce action: ${actionId}`,
      };
    }

    const client = createSalesforceClient({
      connectorId,
      accessToken: credentials.accessToken,
      instanceUrl: (credentials.config.instanceUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
