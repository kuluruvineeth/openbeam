import type { GoogleCalendarClient } from "../client";

export interface EventActionResult {
  success: boolean;
  eventId?: string;
  url?: string;
  error?: string;
}

export async function createCalendarEvent(
  client: GoogleCalendarClient,
  options: {
    calendarId?: string;
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: string[];
    timeZone?: string;
  }
): Promise<EventActionResult> {
  try {
    const calendarId = options.calendarId ?? "primary";

    const event = await client.createEvent(calendarId, {
      summary: options.summary,
      description: options.description,
      location: options.location,
      start: { dateTime: options.startDateTime, timeZone: options.timeZone },
      end: { dateTime: options.endDateTime, timeZone: options.timeZone },
      attendees: options.attendees?.map((email) => ({ email })),
    } as Parameters<typeof client.createEvent>[1]);

    return {
      success: true,
      eventId: event.id,
      url: event.htmlLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    };
  }
}

export async function updateCalendarEvent(
  client: GoogleCalendarClient,
  options: {
    calendarId?: string;
    eventId: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
  }
): Promise<EventActionResult> {
  try {
    const calendarId = options.calendarId ?? "primary";
    const updates: Record<string, unknown> = {};

    if (options.summary) {
      updates.summary = options.summary;
    }
    if (options.description !== undefined) {
      updates.description = options.description;
    }
    if (options.location !== undefined) {
      updates.location = options.location;
    }
    if (options.startDateTime) {
      updates.start = {
        dateTime: options.startDateTime,
        timeZone: options.timeZone,
      };
    }
    if (options.endDateTime) {
      updates.end = {
        dateTime: options.endDateTime,
        timeZone: options.timeZone,
      };
    }

    const event = await client.updateEvent(
      calendarId,
      options.eventId,
      updates as Parameters<typeof client.updateEvent>[2]
    );

    return {
      success: true,
      eventId: event.id,
      url: event.htmlLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
    };
  }
}

export async function deleteCalendarEvent(
  client: GoogleCalendarClient,
  calendarId: string | undefined,
  eventId: string
): Promise<EventActionResult> {
  try {
    await client.deleteEvent(calendarId ?? "primary", eventId);
    return { success: true, eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
    };
  }
}
