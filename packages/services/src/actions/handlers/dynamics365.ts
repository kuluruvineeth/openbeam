import {
  createDynamics365Account,
  createDynamics365Contact,
  createDynamics365Opportunity,
  updateDynamics365Account,
  updateDynamics365Contact,
  updateDynamics365Opportunity,
} from "../../dynamics365/actions";
import {
  createDynamics365Client,
  type Dynamics365Client,
} from "../../dynamics365/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: Dynamics365Client,
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
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async account_create(client, p) {
    const r = await createDynamics365Account(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async account_update(client, p) {
    const r = await updateDynamics365Account(
      client,
      str(p, "accountId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async contact_create(client, p) {
    const r = await createDynamics365Contact(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async contact_update(client, p) {
    const r = await updateDynamics365Contact(
      client,
      str(p, "contactId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async opportunity_create(client, p) {
    const r = await createDynamics365Opportunity(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async opportunity_update(client, p) {
    const r = await updateDynamics365Opportunity(
      client,
      str(p, "opportunityId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "dynamics365",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Dynamics 365 action: ${actionId}`,
      };
    }

    const client = createDynamics365Client({
      connectorId,
      accessToken: credentials.accessToken,
      orgUrl: (credentials.config.orgUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
