import type { MicrosoftCalendarTransformContext } from "@openbeam/types/services/connectors/microsoft-calendar";
import type { GenericDocument } from "@openbeam/vespa";

export type MicrosoftCalendarEvent = {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name?: string; address: string } };
  attendees?: Array<{
    emailAddress: { name?: string; address: string };
    status: { response: string };
  }>;
  webLink: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isCancelled: boolean;
  isAllDay: boolean;
  recurrence?: unknown;
  showAs: string;
  importance: string;
  "@removed"?: { reason: string };
};

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

function buildEventContent(event: MicrosoftCalendarEvent): string {
  const parts: string[] = [];

  if (event.body?.content) {
    const text =
      event.body.contentType === "html"
        ? stripHtml(event.body.content)
        : event.body.content;
    parts.push(text);
  } else if (event.bodyPreview) {
    parts.push(event.bodyPreview);
  }

  if (event.location?.displayName) {
    parts.push(`Location: ${event.location.displayName}`);
  }

  if (event.attendees?.length) {
    const names = event.attendees
      .map((a) => a.emailAddress.name ?? a.emailAddress.address)
      .slice(0, 20);
    parts.push(`Attendees: ${names.join(", ")}`);
  }

  return parts.join(" — ");
}

function parseDateTime(dateTime: string): number {
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) {
    return Date.now();
  }
  return date.getTime();
}

export function transformMicrosoftCalendarEvent(
  event: MicrosoftCalendarEvent,
  context: MicrosoftCalendarTransformContext
): GenericDocument {
  const content = buildEventContent(event);
  const createdAt = parseDateTime(event.createdDateTime);
  const updatedAt = parseDateTime(event.lastModifiedDateTime);

  const organizer = event.organizer?.emailAddress;
  const attendeeCount = event.attendees?.length ?? 0;

  const metadata: Record<string, string | number | boolean> = {
    startTime: event.start.dateTime,
    endTime: event.end.dateTime,
  };

  if (event.showAs) {
    metadata.showAs = event.showAs;
  }
  if (event.location?.displayName) {
    metadata.location = event.location.displayName;
  }
  if (attendeeCount > 0) {
    metadata.attendees = attendeeCount;
  }
  if (event.isAllDay) {
    metadata.allDay = true;
  }
  if (event.recurrence) {
    metadata.recurring = true;
  }
  if (event.importance !== "normal") {
    metadata.importance = event.importance;
  }

  return {
    id: `${context.connectorId}_event_${event.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: event.id,
    document_type: "event",
    document_subtype: "calendar_event",
    title: event.subject || "(No title)",
    content,
    author_email: organizer?.address,
    author_name: organizer?.name ?? organizer?.address,
    created_at: createdAt,
    updated_at: updatedAt,
    url: event.webLink,
    is_public: false,
    access_control: event.attendees?.map((a) => a.emailAddress.address) ?? [],
    metadata,
  };
}
