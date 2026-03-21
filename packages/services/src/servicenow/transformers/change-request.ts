import type { ServiceNowTransformContext } from "@openbeam/types/services/connectors/servicenow";
import type { GenericDocument } from "@openbeam/vespa";
import { extractDisplayValue, parseServiceNowDate, stripHtml } from "./utils";

export type ServiceNowChangeRequest = {
  sys_id: string;
  number: string;
  short_description: string;
  description: string;
  state: string;
  priority: string;
  assigned_to: string | { display_value?: string; value?: string };
  type: string;
  risk: string;
  sys_created_on: string;
  sys_updated_on: string;
};

const STATE_MAP: Record<string, string> = {
  "-5": "New",
  "-4": "Assess",
  "-3": "Authorize",
  "-2": "Scheduled",
  "-1": "Implement",
  "0": "Review",
  "3": "Closed",
  "4": "Canceled",
};

const PRIORITY_MAP: Record<string, string> = {
  "1": "Critical",
  "2": "High",
  "3": "Moderate",
  "4": "Low",
  "5": "Planning",
};

const TYPE_MAP: Record<string, string> = {
  standard: "Standard",
  normal: "Normal",
  emergency: "Emergency",
};

export function transformServiceNowChangeRequest(
  changeRequest: ServiceNowChangeRequest,
  context: ServiceNowTransformContext
): GenericDocument {
  const description = changeRequest.description
    ? stripHtml(changeRequest.description)
    : "";
  const stateLabel = STATE_MAP[changeRequest.state] ?? changeRequest.state;
  const priorityLabel =
    PRIORITY_MAP[changeRequest.priority] ?? changeRequest.priority;
  const assignee = extractDisplayValue(changeRequest.assigned_to);
  const typeLabel = TYPE_MAP[changeRequest.type] ?? changeRequest.type;

  const parts = [
    `State: ${stateLabel}`,
    `Priority: ${priorityLabel}`,
    description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  return {
    id: `${context.connectorId}_change_request_${changeRequest.sys_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: changeRequest.sys_id,
    document_type: "change_request",
    document_subtype: "change_request",
    title:
      changeRequest.short_description ||
      `Change Request ${changeRequest.number}`,
    content,
    author_name: assignee || undefined,
    created_at: parseServiceNowDate(changeRequest.sys_created_on),
    updated_at: parseServiceNowDate(changeRequest.sys_updated_on),
    url: `https://${context.instance}.service-now.com/nav_to.do?uri=change_request.do?sys_id=${changeRequest.sys_id}`,
    is_public: false,
    access_control: [],
    metadata: {
      number: changeRequest.number,
      state: stateLabel,
      priority: priorityLabel,
      ...(typeLabel && { changeType: typeLabel }),
      ...(changeRequest.risk && { risk: changeRequest.risk }),
      ...(assignee && { assignee }),
    },
  };
}
