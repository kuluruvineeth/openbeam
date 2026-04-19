import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendars,
  updateCalendarEvent,
} from "../../google-calendar/actions";
import {
  createGoogleCalendarClient,
  type GoogleCalendarClient,
} from "../../google-calendar/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: GoogleCalendarClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async calendar_list(client, p) {
    const limit = typeof p.limit === "number" ? p.limit : undefined;
    const r = await listCalendars(client, { limit });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { calendars: r.calendars } };
  },

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
    const r = await deleteCalendarEvent(
      client,
      typeof p.calendarId === "string" ? p.calendarId : undefined,
      str(p, "eventId")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "google-calendar",
  supportedActions: Object.keys(actions),
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
