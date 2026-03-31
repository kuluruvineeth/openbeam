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

type Handler = (
  client: SalesforceClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

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
