import type {
  ThingsboardAlarm,
  ThingsboardTransformContext,
} from "@openbeam/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildAlarmContent(alarm: ThingsboardAlarm): string {
  const parts: string[] = [];

  parts.push(`Type: ${alarm.type}`);
  parts.push(`Status: ${alarm.status}`);

  if (alarm.originatorName) {
    parts.push(`Originator: ${alarm.originatorName}`);
  }

  parts.push(`Start: ${new Date(alarm.startTs).toISOString()}`);

  if (alarm.endTs) {
    parts.push(`End: ${new Date(alarm.endTs).toISOString()}`);
  }

  return parts.join("\n");
}

function buildAlarmMetadata(
  alarm: ThingsboardAlarm
): GenericDocument["metadata"] {
  return {
    alarmId: alarm.id.id,
    severity: alarm.severity,
    status: alarm.status,
    ...(alarm.originatorName && { originatorName: alarm.originatorName }),
    startTs: alarm.startTs,
    ...(alarm.endTs && { endTs: alarm.endTs }),
  };
}

export async function transformAlarm(
  alarm: ThingsboardAlarm,
  context: ThingsboardTransformContext
): Promise<GenericDocument> {
  const title = `[${alarm.severity}] ${alarm.type}`;
  const content = buildAlarmContent(alarm);
  const metadata = buildAlarmMetadata(alarm);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = alarm.startTs;
  const updatedAt = alarm.endTs ?? alarm.startTs;

  return {
    id: `${context.connectorId}_alarm_${alarm.id.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: alarm.id.id,
    document_type: "alarm",
    document_subtype: alarm.severity.toLowerCase(),
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "thingsboard",
    source_name: "ThingsBoard",
    url: `${context.baseUrl}/alarms/${alarm.id.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformAlarms(
  alarms: ThingsboardAlarm[],
  context: ThingsboardTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(alarms.map((alarm) => transformAlarm(alarm, context)));
}
