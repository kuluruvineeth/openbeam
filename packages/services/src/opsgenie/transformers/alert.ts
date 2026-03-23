import type { OpsGenieTransformContext } from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { OpsGenieAlert } from "../api/alerts";
import { buildOpsGenieAlertUrl, formatPriority } from "./utils";

function buildAlertContent(alert: OpsGenieAlert): string {
  const parts: string[] = [];

  if (alert.description) {
    parts.push(alert.description);
  }

  parts.push(`Status: ${alert.status}`);
  parts.push(`Priority: ${formatPriority(alert.priority)}`);

  if (alert.acknowledged) {
    parts.push("Acknowledged: Yes");
  }

  if (alert.source) {
    parts.push(`Source: ${alert.source}`);
  }

  if (alert.owner) {
    parts.push(`Owner: ${alert.owner}`);
  }

  if (alert.tags.length > 0) {
    parts.push(`Tags: ${alert.tags.join(", ")}`);
  }

  if (alert.responders?.length) {
    const names = alert.responders.map((r) => r.name ?? r.id).join(", ");
    parts.push(`Responders: ${names}`);
  }

  if (alert.integration) {
    parts.push(`Integration: ${alert.integration.name}`);
  }

  if (alert.count > 1) {
    parts.push(`Occurrence count: ${alert.count}`);
  }

  if (alert.details) {
    const detailEntries = Object.entries(alert.details);
    if (detailEntries.length > 0) {
      parts.push(detailEntries.map(([k, v]) => `${k}: ${v}`).join("\n"));
    }
  }

  return parts.join("\n");
}

function buildAlertMetadata(alert: OpsGenieAlert): GenericDocument["metadata"] {
  return {
    alertId: alert.id,
    tinyId: alert.tinyId,
    status: alert.status,
    priority: alert.priority,
    priorityLabel: formatPriority(alert.priority),
    acknowledged: alert.acknowledged,
    ...(alert.source && { source: alert.source }),
    ...(alert.owner && { owner: alert.owner }),
    ...(alert.tags.length > 0 && { tags: alert.tags.join(", ") }),
    ...(alert.alias && { alias: alert.alias }),
    ...(alert.responders?.length && {
      responders: alert.responders.map((r) => r.name ?? r.id).join(", "),
    }),
    ...(alert.integration && {
      integrationName: alert.integration.name,
    }),
    occurrenceCount: alert.count,
  };
}

export async function transformAlert(
  alert: OpsGenieAlert,
  context: OpsGenieTransformContext
): Promise<GenericDocument> {
  const title = alert.message;
  const content = buildAlertContent(alert);
  const metadata = buildAlertMetadata(alert);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(alert.createdAt).getTime();
  const updatedAt = new Date(alert.updatedAt).getTime();

  return {
    id: `${context.connectorId}_alert_${alert.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: alert.id,
    document_type: "alert",
    document_subtype: alert.priority,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "opsgenie",
    url: buildOpsGenieAlertUrl(alert.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: alert.owner,
  };
}
