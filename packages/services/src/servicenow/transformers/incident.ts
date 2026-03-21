import type { ServiceNowTransformContext } from "@openbeam/types/services/connectors/servicenow";
import type { GenericDocument } from "@openbeam/vespa";
import { extractDisplayValue, parseServiceNowDate, stripHtml } from "./utils";

export type ServiceNowIncident = {
  sys_id: string;
  number: string;
  short_description: string;
  description: string;
  state: string;
  priority: string;
  urgency: string;
  impact: string;
  assigned_to: string | { display_value?: string; value?: string };
  caller_id: string | { display_value?: string; value?: string };
  category: string;
  subcategory: string;
  sys_created_on: string;
  sys_updated_on: string;
};

const STATE_MAP: Record<string, string> = {
  "1": "New",
  "2": "In Progress",
  "3": "On Hold",
  "6": "Resolved",
  "7": "Closed",
  "8": "Canceled",
};

const PRIORITY_MAP: Record<string, string> = {
  "1": "Critical",
  "2": "High",
  "3": "Moderate",
  "4": "Low",
  "5": "Planning",
};

export function transformServiceNowIncident(
  incident: ServiceNowIncident,
  context: ServiceNowTransformContext
): GenericDocument {
  const description = incident.description
    ? stripHtml(incident.description)
    : "";
  const stateLabel = STATE_MAP[incident.state] ?? incident.state;
  const priorityLabel = PRIORITY_MAP[incident.priority] ?? incident.priority;
  const assignee = extractDisplayValue(incident.assigned_to);
  const caller = extractDisplayValue(incident.caller_id);

  const parts = [
    `State: ${stateLabel}`,
    `Priority: ${priorityLabel}`,
    description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  return {
    id: `${context.connectorId}_incident_${incident.sys_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: incident.sys_id,
    document_type: "incident",
    document_subtype: "incident",
    title: incident.short_description || `Incident ${incident.number}`,
    content,
    author_name: caller || assignee || undefined,
    created_at: parseServiceNowDate(incident.sys_created_on),
    updated_at: parseServiceNowDate(incident.sys_updated_on),
    url: `https://${context.instance}.service-now.com/nav_to.do?uri=incident.do?sys_id=${incident.sys_id}`,
    is_public: false,
    access_control: [],
    metadata: {
      number: incident.number,
      state: stateLabel,
      priority: priorityLabel,
      ...(incident.urgency && { urgency: incident.urgency }),
      ...(incident.category && { category: incident.category }),
      ...(incident.subcategory && { subcategory: incident.subcategory }),
      ...(assignee && { assignee }),
      ...(caller && { caller }),
    },
  };
}
