import type { GoogleCalendarTransformContext } from "@openbeam/types/services/connectors/google-calendar";
import type { GenericDocument } from "@openbeam/vespa";
import type { CalendarEvent } from "../client";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildEventContent(event: CalendarEvent): string {
  const parts: string[] = [];

  if (event.description) {
    parts.push(stripHtml(event.description));
  }

  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  if (event.attendees?.length) {
    const names = event.attendees
      .map((a) => a.displayName ?? a.email)
      .slice(0, 20);
    parts.push(`Attendees: ${names.join(", ")}`);
  }

  if (event.conferenceData?.entryPoints?.length) {
    const link = event.conferenceData.entryPoints.find(
      (e) => e.entryPointType === "video"
    );
    if (link?.uri) {
      parts.push(`Video: ${link.uri}`);
    }
  }

  return parts.join(" — ");
}

function getEventTime(timeSpec?: {
  dateTime?: string;
  date?: string;
}): number | undefined {
  if (!timeSpec) {
    return;
  }
  const raw = timeSpec.dateTime ?? timeSpec.date;
  if (!raw) {
    return;
  }
  return new Date(raw).getTime();
}

export function transformCalendarEvent(
  event: CalendarEvent,
  context: GoogleCalendarTransformContext,
  calendarName?: string
): GenericDocument {
  const content = buildEventContent(event);
  const startTime = getEventTime(event.start);
  const endTime = getEventTime(event.end);
  const createdAt = new Date(event.created).getTime();
  const updatedAt = new Date(event.updated).getTime();

  const organizer = event.organizer;
  const attendeeCount = event.attendees?.length ?? 0;

  return {
    id: `${context.connectorId}_event_${event.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: event.id,
    document_type: "event",
    document_subtype: "calendar_event",
    title: event.summary ?? "(No title)",
    content,
    author_email: organizer?.email,
    author_name: organizer?.displayName ?? organizer?.email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: event.htmlLink,
    is_public: event.visibility === "public",
    access_control: event.attendees?.map((a) => a.email) ?? [],
    metadata: {
      status: event.status,
      ...(startTime && {
        startTime: event.start?.dateTime ?? event.start?.date,
      }),
      ...(endTime && { endTime: event.end?.dateTime ?? event.end?.date }),
      ...(event.location && { location: event.location }),
      ...(attendeeCount > 0 && { attendees: attendeeCount }),
      ...(event.recurringEventId && { recurring: true }),
      ...(calendarName && { calendar: calendarName }),
      ...(event.transparency && { transparency: event.transparency }),
    },
  };
}
