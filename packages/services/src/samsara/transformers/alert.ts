import type { SamsaraTransformContext } from "@openplane/types/services/connectors/samsara";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface SamsaraAlert {
  id: string;
  alertType: string;
  conditionName: string;
  vehicle?: { id: string; name: string };
  driver?: { id: string; name: string };
  resolvedAtTime?: string;
  occurredAtTime?: string;
}

function buildAlertContent(alert: SamsaraAlert): string {
  const parts: string[] = [alert.conditionName];

  if (alert.vehicle) {
    parts.push(`Vehicle: ${alert.vehicle.name}`);
  }
  if (alert.driver) {
    parts.push(`Driver: ${alert.driver.name}`);
  }
  if (alert.resolvedAtTime) {
    parts.push(`Resolved: ${alert.resolvedAtTime}`);
  }

  return parts.join("\n");
}

function buildAlertMetadata(alert: SamsaraAlert): GenericDocument["metadata"] {
  return {
    alertId: alert.id,
    alertType: alert.alertType,
    ...(alert.vehicle && {
      vehicleId: alert.vehicle.id,
      vehicleName: alert.vehicle.name,
    }),
    ...(alert.driver && {
      driverId: alert.driver.id,
      driverName: alert.driver.name,
    }),
    ...(alert.resolvedAtTime && { resolvedAt: alert.resolvedAtTime }),
  };
}

export async function transformAlert(
  alert: SamsaraAlert,
  context: SamsaraTransformContext
): Promise<GenericDocument> {
  const title = alert.conditionName;
  const content = buildAlertContent(alert);
  const metadata = buildAlertMetadata(alert);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const occurredAt = alert.occurredAtTime
    ? new Date(alert.occurredAtTime).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_alert_${alert.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: alert.id,
    document_type: "alert",
    title,
    content,
    created_at: occurredAt,
    updated_at: occurredAt,
    resolved_at: alert.resolvedAtTime
      ? new Date(alert.resolvedAtTime).getTime()
      : undefined,
    source_type: "samsara",
    source_name: context.organizationName,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformAlerts(
  alerts: SamsaraAlert[],
  context: SamsaraTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(alerts.map((alert) => transformAlert(alert, context)));
}
