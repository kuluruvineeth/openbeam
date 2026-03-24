import type { FellowTransformContext } from "@openbeam/types/services/connectors/fellow";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FellowMeeting } from "../api/meetings";
import { stripHtml } from "./utils";

function buildMeetingContent(meeting: FellowMeeting): string {
  const parts: string[] = [];

  if (meeting.notes.length > 0) {
    const notesBodies = meeting.notes
      .map((n) => stripHtml(n.body))
      .filter(Boolean);
    if (notesBodies.length > 0) {
      parts.push(notesBodies.join("\n\n"));
    }
  }

  if (meeting.attendees.length > 0) {
    const names = meeting.attendees.map((a) => a.name ?? a.email).join(", ");
    parts.push(`Attendees: ${names}`);
  }

  const start = new Date(meeting.start_time);
  const end = new Date(meeting.end_time);
  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60_000
  );
  if (durationMinutes > 0) {
    parts.push(`Duration: ${durationMinutes} minutes`);
  }

  return parts.join("\n");
}

export async function transformMeeting(
  meeting: FellowMeeting,
  context: FellowTransformContext
): Promise<GenericDocument> {
  const title = meeting.title;
  const content = buildMeetingContent(meeting);
  const metadata: GenericDocument["metadata"] = {
    attendeeCount: String(meeting.attendees.length),
    noteCount: String(meeting.notes.length),
    startTime: meeting.start_time,
    endTime: meeting.end_time,
    ...(meeting.attendees.length > 0 && {
      attendees: meeting.attendees.map((a) => a.name ?? a.email).join(", "),
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_meeting_${meeting.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: meeting.id,
    document_type: "meeting",
    document_subtype: meeting.notes.length > 0 ? "with_notes" : "no_notes",
    title,
    content,
    created_at: new Date(meeting.created_at).getTime(),
    updated_at: new Date(meeting.updated_at).getTime(),
    source_type: "fellow",
    url: meeting.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: meeting.attendees[0]?.name,
    author_email: meeting.attendees[0]?.email,
  };
}
