import type { PagerDutyTransformContext } from "@openbeam/types/services/connectors/pagerduty";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PagerDutyIncident {
  id: string;
  incident_number: number;
  title: string;
  description?: string;
  status: string;
  urgency: string;
  html_url: string;
  created_at: string;
  updated_at?: string;
  last_status_change_at?: string;
  resolved_at?: string;
  priority?: {
    summary: string;
    name: string;
    id: string;
  } | null;
  service: {
    id: string;
    summary: string;
    html_url?: string;
  };
  escalation_policy?: {
    id: string;
    summary: string;
  };
  teams?: {
    id: string;
    summary: string;
  }[];
  assignments?: {
    at: string;
    assignee: {
      id: string;
      summary: string;
    };
  }[];
  acknowledgements?: {
    at: string;
    acknowledger: {
      id: string;
      summary: string;
    };
  }[];
  incident_key?: string;
  resolve_reason?: {
    type: string;
    incident?: { id: string; summary: string };
  } | null;
}

function buildIncidentContent(incident: PagerDutyIncident): string {
  const parts: string[] = [];

  if (incident.description) {
    parts.push(incident.description);
  }

  parts.push(`Status: ${incident.status}`);
  parts.push(`Urgency: ${incident.urgency}`);

  if (incident.priority) {
    parts.push(`Priority: ${incident.priority.name}`);
  }

  parts.push(`Service: ${incident.service.summary}`);

  if (incident.escalation_policy) {
    parts.push(`Escalation Policy: ${incident.escalation_policy.summary}`);
  }

  if (incident.teams?.length) {
    parts.push(`Teams: ${incident.teams.map((t) => t.summary).join(", ")}`);
  }

  if (incident.assignments?.length) {
    parts.push(
      `Assigned to: ${incident.assignments.map((a) => a.assignee.summary).join(", ")}`
    );
  }

  if (incident.acknowledgements?.length) {
    parts.push(
      `Acknowledged by: ${incident.acknowledgements.map((a) => a.acknowledger.summary).join(", ")}`
    );
  }

  if (incident.resolved_at) {
    parts.push(`Resolved at: ${incident.resolved_at}`);
  }

  return parts.join("\n");
}

function buildIncidentMetadata(
  incident: PagerDutyIncident
): GenericDocument["metadata"] {
  return {
    incidentId: incident.id,
    incidentNumber: incident.incident_number,
    status: incident.status,
    urgency: incident.urgency,
    serviceId: incident.service.id,
    serviceName: incident.service.summary,
    ...(incident.priority && { priority: incident.priority.name }),
    ...(incident.escalation_policy && {
      escalationPolicy: incident.escalation_policy.summary,
    }),
    ...(incident.teams?.length && {
      teams: incident.teams.map((t) => t.summary).join(", "),
    }),
    ...(incident.assignments?.length && {
      assignees: incident.assignments.map((a) => a.assignee.summary).join(", "),
    }),
    ...(incident.incident_key && { incidentKey: incident.incident_key }),
    ...(incident.resolved_at && { resolvedAt: incident.resolved_at }),
  };
}

export async function transformIncident(
  incident: PagerDutyIncident,
  context: PagerDutyTransformContext
): Promise<GenericDocument> {
  const title = `[#${incident.incident_number}] ${incident.title}`;
  const content = buildIncidentContent(incident);
  const metadata = buildIncidentMetadata(incident);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(incident.created_at).getTime();
  const updatedAt = incident.updated_at
    ? new Date(incident.updated_at).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_incident_${incident.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: incident.id,
    document_type: "incident",
    document_subtype: incident.urgency,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "pagerduty",
    source_name: context.subdomain,
    url: incident.html_url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: incident.assignments?.[0]?.assignee.summary,
  };
}
