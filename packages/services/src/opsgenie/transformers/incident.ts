import type { OpsGenieTransformContext } from "@openbeam/types/services/connectors/opsgenie";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { OpsGenieIncident } from "../api/incidents";
import { buildOpsGenieIncidentUrl, formatPriority } from "./utils";

function buildIncidentContent(incident: OpsGenieIncident): string {
  const parts: string[] = [];

  if (incident.description) {
    parts.push(incident.description);
  }

  parts.push(`Status: ${incident.status}`);
  parts.push(`Priority: ${formatPriority(incident.priority)}`);

  if (incident.ownerTeam) {
    parts.push(`Owner Team: ${incident.ownerTeam}`);
  }

  if (incident.tags.length > 0) {
    parts.push(`Tags: ${incident.tags.join(", ")}`);
  }

  if (incident.responders?.length) {
    const names = incident.responders.map((r) => r.name ?? r.id).join(", ");
    parts.push(`Responders: ${names}`);
  }

  if (incident.impactedServices?.length) {
    parts.push(`Impacted Services: ${incident.impactedServices.join(", ")}`);
  }

  if (incident.extraProperties) {
    const entries = Object.entries(incident.extraProperties);
    if (entries.length > 0) {
      parts.push(entries.map(([k, v]) => `${k}: ${v}`).join("\n"));
    }
  }

  return parts.join("\n");
}

function buildIncidentMetadata(
  incident: OpsGenieIncident
): GenericDocument["metadata"] {
  return {
    incidentId: incident.id,
    tinyId: incident.tinyId,
    status: incident.status,
    priority: incident.priority,
    priorityLabel: formatPriority(incident.priority),
    ...(incident.ownerTeam && { ownerTeam: incident.ownerTeam }),
    ...(incident.tags.length > 0 && { tags: incident.tags.join(", ") }),
    ...(incident.responders?.length && {
      responders: incident.responders.map((r) => r.name ?? r.id).join(", "),
    }),
    ...(incident.impactedServices?.length && {
      impactedServices: incident.impactedServices.join(", "),
    }),
  };
}

export async function transformIncident(
  incident: OpsGenieIncident,
  context: OpsGenieTransformContext
): Promise<GenericDocument> {
  const title = `[Incident] ${incident.message}`;
  const content = buildIncidentContent(incident);
  const metadata = buildIncidentMetadata(incident);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(incident.createdAt).getTime();
  const updatedAt = new Date(incident.updatedAt).getTime();

  return {
    id: `${context.connectorId}_incident_${incident.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: incident.id,
    document_type: "incident",
    document_subtype: incident.priority,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "opsgenie",
    url: buildOpsGenieIncidentUrl(incident.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
