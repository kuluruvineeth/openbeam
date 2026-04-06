import {
  createMicrosoftGraphClient,
  type MicrosoftGraphClient,
} from "../../microsoft/client";
import {
  createMicrosoftCalendarEvent,
  deleteMicrosoftCalendarEvent,
  updateMicrosoftCalendarEvent,
} from "../../microsoft-calendar/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MicrosoftGraphClient,
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
  async event_create(client, p) {
    const r = await createMicrosoftCalendarEvent(client, {
      subject: str(p, "subject"),
      body: typeof p.body === "string" ? p.body : undefined,
      location: typeof p.location === "string" ? p.location : undefined,
      startDateTime: str(p, "startDateTime"),
      endDateTime: str(p, "endDateTime"),
      timeZone: typeof p.timeZone === "string" ? p.timeZone : undefined,
      attendees: Array.isArray(p.attendees)
        ? (p.attendees as string[])
        : undefined,
      isAllDay: p.isAllDay === true,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { eventId: r.eventId, url: r.url } };
  },

  async event_update(client, p) {
    const r = await updateMicrosoftCalendarEvent(client, {
      eventId: str(p, "eventId"),
      subject: typeof p.subject === "string" ? p.subject : undefined,
      body: typeof p.body === "string" ? p.body : undefined,
      location: typeof p.location === "string" ? p.location : undefined,
      startDateTime:
        typeof p.startDateTime === "string" ? p.startDateTime : undefined,
      endDateTime:
        typeof p.endDateTime === "string" ? p.endDateTime : undefined,
      timeZone: typeof p.timeZone === "string" ? p.timeZone : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { eventId: r.eventId, url: r.url } };
  },

  async event_delete(client, p) {
    const r = await deleteMicrosoftCalendarEvent(client, str(p, "eventId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "microsoft-calendar",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Microsoft Calendar action: ${actionId}`,
      };
    }

    const client = createMicrosoftGraphClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
