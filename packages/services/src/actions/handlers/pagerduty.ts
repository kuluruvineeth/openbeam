import {
  addIncidentNote,
  createIncident,
  updateIncidentStatus,
} from "../../pagerduty/actions";
import {
  createPagerDutyClient,
  type PagerDutyClient,
} from "../../pagerduty/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: PagerDutyClient,
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
  async incident_create(client, p) {
    const r = await createIncident(client, {
      title: str(p, "title"),
      serviceId: str(p, "serviceId"),
      urgency:
        typeof p.urgency === "string"
          ? (p.urgency as "high" | "low")
          : undefined,
      body: typeof p.body === "string" ? p.body : undefined,
      fromEmail: str(p, "fromEmail"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async incident_status_update(client, p) {
    const r = await updateIncidentStatus(client, {
      incidentId: str(p, "incidentId"),
      status: str(p, "status") as "acknowledged" | "resolved",
      fromEmail: str(p, "fromEmail"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { updated: true } };
  },

  async incident_note_add(client, p) {
    const r = await addIncidentNote(client, {
      incidentId: str(p, "incidentId"),
      content: str(p, "content"),
      fromEmail: str(p, "fromEmail"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "pagerduty",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported PagerDuty action: ${actionId}`,
      };
    }

    const client = createPagerDutyClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
