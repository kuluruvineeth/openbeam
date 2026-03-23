import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Case } from "../api/cases";
import { buildDynamics365Url, formatCaseState, formatPriority } from "./utils";

export function transformDynamics365Case(
  incident: Dynamics365Case,
  context: Dynamics365TransformContext
): GenericDocument {
  const customerName = (incident as Record<string, unknown>)[
    "_customerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;
  const ownerName = (incident as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  const state = formatCaseState(incident.statecode);
  const priority = formatPriority(incident.prioritycode);

  const parts = [
    `Case #${incident.ticketnumber}`,
    `Status: ${state}`,
    priority ? `Priority: ${priority}` : null,
    customerName ? `Customer: ${customerName}` : null,
    incident.description,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(incident.createdon).getTime();
  const updatedAt = new Date(incident.modifiedon).getTime();

  return {
    id: `${context.connectorId}_case_${incident.incidentid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: incident.incidentid,
    document_type: "case",
    document_subtype: state.toLowerCase(),
    title: incident.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(context.orgUrl, "incident", incident.incidentid),
    author_name: ownerName,
    is_public: false,
    access_control: [],
    metadata: {
      ticketNumber: incident.ticketnumber,
      status: state,
      ...(priority && { priority }),
      ...(customerName && { customerName }),
      ...(incident.resolvedon && { resolvedOn: incident.resolvedon }),
    },
  };
}
