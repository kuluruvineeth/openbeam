import type { PagerDutyTransformContext } from "@openbeam/types/services/connectors/pagerduty";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PagerDutyScheduleLayer {
  id: string;
  name?: string;
  start: string;
  rotation_virtual_start: string;
  rotation_turn_length_seconds: number;
  users: {
    user: {
      id: string;
      summary: string;
    };
  }[];
}

export interface PagerDutySchedule {
  id: string;
  name: string;
  description?: string;
  time_zone: string;
  html_url: string;
  schedule_layers?: PagerDutyScheduleLayer[];
  users?: {
    id: string;
    summary: string;
  }[];
  escalation_policies?: {
    id: string;
    summary: string;
  }[];
}

function buildScheduleContent(schedule: PagerDutySchedule): string {
  const parts: string[] = [];

  if (schedule.description) {
    parts.push(schedule.description);
  }

  parts.push(`Time Zone: ${schedule.time_zone}`);

  if (schedule.users?.length) {
    parts.push(`Users: ${schedule.users.map((u) => u.summary).join(", ")}`);
  }

  if (schedule.schedule_layers?.length) {
    for (const layer of schedule.schedule_layers) {
      const layerName = layer.name ?? "Layer";
      const users = layer.users.map((u) => u.user.summary).join(", ");
      const rotationHours = Math.round(
        layer.rotation_turn_length_seconds / 3600
      );
      parts.push(`${layerName}: ${users} (${rotationHours}h rotation)`);
    }
  }

  if (schedule.escalation_policies?.length) {
    parts.push(
      `Escalation Policies: ${schedule.escalation_policies.map((ep) => ep.summary).join(", ")}`
    );
  }

  return parts.join("\n");
}

function buildScheduleMetadata(
  schedule: PagerDutySchedule
): GenericDocument["metadata"] {
  return {
    scheduleId: schedule.id,
    timeZone: schedule.time_zone,
    ...(schedule.users?.length && {
      users: schedule.users.map((u) => u.summary).join(", "),
      userCount: schedule.users.length,
    }),
    ...(schedule.schedule_layers?.length && {
      layerCount: schedule.schedule_layers.length,
    }),
    ...(schedule.escalation_policies?.length && {
      escalationPolicies: schedule.escalation_policies
        .map((ep) => ep.summary)
        .join(", "),
    }),
  };
}

export async function transformSchedule(
  schedule: PagerDutySchedule,
  context: PagerDutyTransformContext
): Promise<GenericDocument> {
  const title = schedule.name;
  const content = buildScheduleContent(schedule);
  const metadata = buildScheduleMetadata(schedule);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

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
    created_at: now,
    updated_at: now,
    source_type: "pagerduty",
    source_name: context.subdomain,
    url: schedule.html_url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
