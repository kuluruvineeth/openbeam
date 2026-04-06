import {
  addServiceNowComment,
  createServiceNowIncident,
  updateServiceNowIncident,
} from "../../servicenow/actions";
import {
  createServiceNowClient,
  type ServiceNowClient,
} from "../../servicenow/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: ServiceNowClient,
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
  async incident_create(client, p) {
    const r = await createServiceNowIncident(client, {
      short_description: str(p, "shortDescription"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      urgency: typeof p.urgency === "string" ? p.urgency : undefined,
      category: typeof p.category === "string" ? p.category : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { sysId: r.sysId, number: r.number, url: r.url },
    };
  },

  async incident_update(client, p) {
    const r = await updateServiceNowIncident(client, str(p, "sysId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { sysId: r.sysId, url: r.url } };
  },

  async incident_comment(client, p) {
    const isWorkNote = typeof p.isWorkNote === "boolean" ? p.isWorkNote : false;
    const r = await addServiceNowComment(
      client,
      str(p, "sysId"),
      str(p, "comment"),
      isWorkNote
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { sysId: r.sysId, url: r.url } };
  },
};

registerHandler({
  connectorType: "servicenow",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported ServiceNow action: ${actionId}`,
      };
    }

    const client = createServiceNowClient({
      connectorId,
      accessToken: credentials.accessToken,
      instance: (credentials.config.instance as string) ?? "",
    });

    return await handler(client, params);
  },
});
