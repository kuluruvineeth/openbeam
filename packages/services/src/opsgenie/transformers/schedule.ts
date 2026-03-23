import type { OpsGenieTransformContext } from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type {
  OpsGenieOnCallParticipant,
  OpsGenieSchedule,
} from "../api/schedules";

function formatRotationLength(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours >= 168) {
    return `${Math.floor(hours / 168)}w`;
  }
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}d`;
  }
  return `${hours}h`;
}

function buildScheduleContent(
  schedule: OpsGenieSchedule,
  onCallParticipants: OpsGenieOnCallParticipant[]
): string {
  const parts: string[] = [];

  if (schedule.description) {
    parts.push(schedule.description);
  }

  if (schedule.timezone) {
    parts.push(`Timezone: ${schedule.timezone}`);
  }

  parts.push(`Enabled: ${schedule.enabled ? "Yes" : "No"}`);

  if (schedule.ownerTeam?.name) {
    parts.push(`Team: ${schedule.ownerTeam.name}`);
  }

  if (onCallParticipants.length > 0) {
    parts.push(
      `Currently on-call: ${onCallParticipants.map((p) => p.name).join(", ")}`
    );
  }

  if (schedule.rotations?.length) {
    for (const rotation of schedule.rotations) {
      const participantNames = rotation.participants
        .map((p) => p.username ?? p.id)
        .join(", ");
      const length = formatRotationLength(rotation.length);
      const name = rotation.name ?? "Rotation";
      parts.push(`${name}: ${participantNames} (${length} rotation)`);
    }
  }

  return parts.join("\n");
}

function buildScheduleMetadata(
  schedule: OpsGenieSchedule,
  onCallParticipants: OpsGenieOnCallParticipant[]
): GenericDocument["metadata"] {
  return {
    scheduleId: schedule.id,
    enabled: schedule.enabled,
    ...(schedule.timezone && { timezone: schedule.timezone }),
    ...(schedule.ownerTeam?.name && {
      teamName: schedule.ownerTeam.name,
    }),
    ...(schedule.rotations?.length && {
      rotationCount: schedule.rotations.length,
    }),
    ...(onCallParticipants.length > 0 && {
      currentOnCall: onCallParticipants.map((p) => p.name).join(", "),
      onCallCount: onCallParticipants.length,
    }),
  };
}

export async function transformSchedule(
  schedule: OpsGenieSchedule,
  context: OpsGenieTransformContext,
  onCallParticipants: OpsGenieOnCallParticipant[] = []
): Promise<GenericDocument> {
  const title = schedule.name;
  const content = buildScheduleContent(schedule, onCallParticipants);
  const metadata = buildScheduleMetadata(schedule, onCallParticipants);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_schedule_${schedule.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: schedule.id,
    document_type: "schedule",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "opsgenie",
    url: `https://app.opsgenie.com/schedule/${schedule.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
