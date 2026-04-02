import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface EventActionResult {
  success: boolean;
  eventId?: string;
  url?: string;
  error?: string;
}

type GraphEventResponse = {
  id: string;
  webLink: string;
};

export async function createMicrosoftCalendarEvent(
  client: MicrosoftGraphClient,
  options: {
    subject: string;
    body?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
    attendees?: string[];
    isAllDay?: boolean;
  }
): Promise<EventActionResult> {
  try {
    const timeZone = options.timeZone ?? "UTC";
    const event: Record<string, unknown> = {
      subject: options.subject,
      start: { dateTime: options.startDateTime, timeZone },
      end: { dateTime: options.endDateTime, timeZone },
      isAllDay: options.isAllDay ?? false,
    };

    if (options.body) {
      event.body = { contentType: "text", content: options.body };
    }
    if (options.location) {
      event.location = { displayName: options.location };
    }
    if (options.attendees?.length) {
      event.attendees = options.attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      }));
    }

    const result = await client.post<GraphEventResponse>("/me/events", event);

    return { success: true, eventId: result.id, url: result.webLink };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    };
  }
}

export async function updateMicrosoftCalendarEvent(
  client: MicrosoftGraphClient,
  options: {
    eventId: string;
    subject?: string;
    body?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
  }
): Promise<EventActionResult> {
  try {
    const updates: Record<string, unknown> = {};
    const timeZone = options.timeZone ?? "UTC";

    if (options.subject) {
      updates.subject = options.subject;
    }
    if (options.body !== undefined) {
      updates.body = { contentType: "text", content: options.body };
    }
    if (options.location !== undefined) {
      updates.location = { displayName: options.location };
    }
    if (options.startDateTime) {
      updates.start = { dateTime: options.startDateTime, timeZone };
    }
    if (options.endDateTime) {
      updates.end = { dateTime: options.endDateTime, timeZone };
    }

    const result = await client.patch<GraphEventResponse>(
      `/me/events/${encodeURIComponent(options.eventId)}`,
      updates
    );

    return { success: true, eventId: result.id, url: result.webLink };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
    };
  }
}

export async function deleteMicrosoftCalendarEvent(
  client: MicrosoftGraphClient,
  eventId: string
): Promise<EventActionResult> {
  try {
    await client.del(`/me/events/${encodeURIComponent(eventId)}`);
    return { success: true, eventId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
    };
  }
}
