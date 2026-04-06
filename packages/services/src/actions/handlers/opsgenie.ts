import {
  acknowledgeAlert,
  addAlertNote,
  closeAlert,
  createAlert,
} from "../../opsgenie/actions/alerts";
import {
  createIncident,
  resolveIncident,
} from "../../opsgenie/actions/incidents";
import {
  createOpsGenieClient,
  type OpsGenieClient,
} from "../../opsgenie/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: OpsGenieClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async alert_create(client, p) {
    const r = await createAlert(client, {
      message: str(p, "message"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority:
        typeof p.priority === "string"
          ? (p.priority as "P1" | "P2" | "P3" | "P4" | "P5")
          : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async alert_acknowledge(client, p) {
    const r = await acknowledgeAlert(client, {
      alertId: str(p, "alertId"),
      note: typeof p.note === "string" ? p.note : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { acknowledged: true } };
  },

  async alert_close(client, p) {
    const r = await closeAlert(client, {
      alertId: str(p, "alertId"),
      note: typeof p.note === "string" ? p.note : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { closed: true } };
  },

  async alert_note_add(client, p) {
    const r = await addAlertNote(client, {
      alertId: str(p, "alertId"),
      note: str(p, "note"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { added: true } };
  },

  async incident_create(client, p) {
    const r = await createIncident(client, {
      message: str(p, "message"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority:
        typeof p.priority === "string"
          ? (p.priority as "P1" | "P2" | "P3" | "P4" | "P5")
          : "P3",
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async incident_resolve(client, p) {
    const r = await resolveIncident(client, {
      incidentId: str(p, "incidentId"),
      note: typeof p.note === "string" ? p.note : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { resolved: true } };
  },
};

registerHandler({
  connectorType: "opsgenie",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported OpsGenie action: ${actionId}`,
      };
    }

    const client = createOpsGenieClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      region:
        typeof credentials.config.region === "string"
          ? (credentials.config.region as "us" | "eu")
          : "us",
    });

    return await handler(client, params);
  },
});
