import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogIncident } from "../api/incidents";
import { buildDatadogUrl, formatIncidentSeverity } from "./utils";

function buildIncidentContent(
  incident: DatadogIncident,
  commanderName?: string
): string {
  const attrs = incident.attributes;
  const parts: string[] = [];

  parts.push(`Severity: ${formatIncidentSeverity(attrs.severity)}`);
  parts.push(`State: ${attrs.state}`);
  parts.push(`Detection: ${attrs.detection_method}`);

  if (commanderName) {
    parts.push(`Commander: ${commanderName}`);
  }

  if (attrs.customer_impacted) {
    parts.push("Customer impacted: Yes");
    if (attrs.customer_impact_scope) {
      parts.push(`Impact scope: ${attrs.customer_impact_scope}`);
    }
  }

  if (attrs.resolved) {
    parts.push(`Resolved: ${new Date(attrs.resolved).toISOString()}`);
  }

  if (attrs.fields) {
    for (const [key, field] of Object.entries(attrs.fields)) {
      if (field.value !== null && field.value !== undefined) {
        parts.push(`${key}: ${String(field.value)}`);
      }
    }
  }

  return parts.join("\n");
}

function buildIncidentMetadata(
  incident: DatadogIncident,
  commanderName?: string
): GenericDocument["metadata"] {
  const attrs = incident.attributes;
  return {
    incidentId: incident.id,
    severity: attrs.severity,
    severityLabel: formatIncidentSeverity(attrs.severity),
    state: attrs.state,
    detectionMethod: attrs.detection_method,
    customerImpacted: attrs.customer_impacted,
    ...(attrs.customer_impact_scope && {
      impactScope: attrs.customer_impact_scope,
    }),
    ...(commanderName && { commander: commanderName }),
    ...(attrs.resolved && { resolved: attrs.resolved }),
  };
}

export async function transformIncident(
  incident: DatadogIncident,
  context: DatadogTransformContext,
  commanderName?: string
): Promise<GenericDocument> {
  const title = incident.attributes.title;
  const content = buildIncidentContent(incident, commanderName);
  const metadata = buildIncidentMetadata(incident, commanderName);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(incident.attributes.created).getTime();
  const updatedAt = new Date(incident.attributes.modified).getTime();

  return {
    id: `${context.connectorId}_incident_${incident.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: incident.id,
    document_type: "incident",
    document_subtype: incident.attributes.severity,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(context.site, `/incidents/${incident.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: commanderName,
  };
}
