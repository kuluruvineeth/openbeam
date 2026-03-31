import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "../../google-calendar/actions";
import {
  createGoogleCalendarClient,
  type GoogleCalendarClient,
} from "../../google-calendar/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GoogleCalendarClient,
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
    const r = await createCalendarEvent(client, {
      calendarId: typeof p.calendarId === "string" ? p.calendarId : undefined,
      summary: str(p, "summary"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      location: typeof p.location === "string" ? p.location : undefined,
      startDateTime: str(p, "startDateTime"),
      endDateTime: str(p, "endDateTime"),
      attendees: Array.isArray(p.attendees)
        ? (p.attendees as string[])
        : undefined,
      timeZone: typeof p.timeZone === "string" ? p.timeZone : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { eventId: r.eventId, url: r.url } };
  },

  async event_update(client, p) {
    const r = await updateCalendarEvent(client, {
      calendarId: typeof p.calendarId === "string" ? p.calendarId : undefined,
      eventId: str(p, "eventId"),
      summary: typeof p.summary === "string" ? p.summary : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
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
    const r = await deleteCalendarEvent(client, {
      calendarId: typeof p.calendarId === "string" ? p.calendarId : undefined,
      eventId: str(p, "eventId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "google-calendar",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Google Calendar action: ${actionId}`,
      };
    }

    const client = createGoogleCalendarClient({
      connectorId,
      accessToken: credentials.accessToken || "",
    });

    return await handler(client, params);
  },
});
