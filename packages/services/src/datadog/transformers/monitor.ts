import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogMonitor } from "../api/monitors";
import { buildDatadogUrl, formatMonitorStatus } from "./utils";

function buildMonitorContent(monitor: DatadogMonitor): string {
  const parts: string[] = [];

  if (monitor.message) {
    parts.push(monitor.message);
  }

  parts.push(`Type: ${monitor.type}`);
  parts.push(`Status: ${formatMonitorStatus(monitor.overall_state)}`);
  parts.push(`Query: ${monitor.query}`);

  if (monitor.priority !== null) {
    parts.push(`Priority: P${monitor.priority}`);
  }

  if (monitor.tags.length > 0) {
    parts.push(`Tags: ${monitor.tags.join(", ")}`);
  }

  if (monitor.creator.name ?? monitor.creator.email) {
    parts.push(`Creator: ${monitor.creator.name ?? monitor.creator.email}`);
  }

  if (monitor.options?.thresholds) {
    const thresholds = Object.entries(monitor.options.thresholds)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    parts.push(`Thresholds: ${thresholds}`);
  }

  return parts.join("\n");
}

function buildMonitorMetadata(
  monitor: DatadogMonitor
): GenericDocument["metadata"] {
  return {
    monitorId: monitor.id,
    type: monitor.type,
    status: monitor.overall_state,
    statusLabel: formatMonitorStatus(monitor.overall_state),
    ...(monitor.priority !== null && { priority: `P${monitor.priority}` }),
    ...(monitor.tags.length > 0 && { tags: monitor.tags.join(", ") }),
    creator: monitor.creator.name ?? monitor.creator.email,
    multi: monitor.multi,
    ...(monitor.deleted && { deleted: true }),
  };
}

export async function transformMonitor(
  monitor: DatadogMonitor,
  context: DatadogTransformContext
): Promise<GenericDocument> {
  const title = monitor.name;
  const content = buildMonitorContent(monitor);
  const metadata = buildMonitorMetadata(monitor);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(monitor.created).getTime();
  const updatedAt = new Date(monitor.modified).getTime();

  return {
    id: `${context.connectorId}_monitor_${monitor.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(monitor.id),
    document_type: "monitor",
    document_subtype: monitor.type,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(context.site, `/monitors/${monitor.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: monitor.creator.name ?? monitor.creator.email,
  };
}
