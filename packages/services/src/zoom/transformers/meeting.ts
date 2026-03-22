import type {
  ZoomMeeting,
  ZoomTransformContext,
} from "@openbeam/types/services/connectors/zoom";
import type { GenericDocument } from "@openbeam/vespa";

export function transformZoomMeeting(
  meeting: ZoomMeeting,
  context: ZoomTransformContext,
  hostEmail?: string
): GenericDocument {
  const contentParts: string[] = [];

  if (meeting.topic) {
    contentParts.push(meeting.topic);
  }
  if (meeting.agenda) {
    contentParts.push(meeting.agenda);
  }

  if (meeting.duration) {
    contentParts.push(`Duration: ${meeting.duration} minutes`);
  }
  if (meeting.participants_count) {
    contentParts.push(`Participants: ${meeting.participants_count}`);
  }

  const dateSource = meeting.start_time ?? meeting.created_at;
  const createdAt = dateSource ? new Date(dateSource).getTime() : Date.now();

  return {
    id: `${context.connectorId}_meeting_${meeting.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(meeting.id),
    document_type: "meeting",
    document_subtype: meetingTypeLabel(meeting.type),
    title: meeting.topic || `Meeting ${meeting.id}`,
    content: contentParts.join("\n\n"),
    author_name: hostEmail,
    author_email: hostEmail,
    created_at: createdAt,
    updated_at: createdAt,
    url: meeting.join_url ?? `https://zoom.us/meeting/${meeting.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      meetingId: String(meeting.id),
      ...(meeting.duration && {
        duration: String(meeting.duration),
      }),
      ...(meeting.participants_count && {
        participants: String(meeting.participants_count),
      }),
      ...(meeting.timezone && { timezone: meeting.timezone }),
      meetingType: meetingTypeLabel(meeting.type),
    },
  };
}

function meetingTypeLabel(type: number): string {
  const labels: Record<number, string> = {
    1: "instant",
    2: "scheduled",
    3: "recurring_no_fixed",
    4: "personal_meeting_room",
    8: "recurring_fixed",
  };
  return labels[type] ?? "other";
}
