import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Lead } from "../api/leads";
import { buildDynamics365Url, formatLeadState } from "./utils";

export function transformDynamics365Lead(
  lead: Dynamics365Lead,
  context: Dynamics365TransformContext
): GenericDocument {
  const ownerName = (lead as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  const state = formatLeadState(lead.statecode);
  const parts = [
    lead.subject ? `Topic: ${lead.subject}` : null,
    lead.companyname ? `Company: ${lead.companyname}` : null,
    lead.jobtitle ? `Title: ${lead.jobtitle}` : null,
    lead.emailaddress1 ? `Email: ${lead.emailaddress1}` : null,
    `Status: ${state}`,
    lead.estimatedvalue ? `Estimated Value: ${lead.estimatedvalue}` : null,
    lead.description,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(lead.createdon).getTime();
  const updatedAt = new Date(lead.modifiedon).getTime();

  return {
    id: `${context.connectorId}_lead_${lead.leadid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: lead.leadid,
    document_type: "lead",
    document_subtype: state.toLowerCase(),
    title: lead.fullname,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(context.orgUrl, "lead", lead.leadid),
    author_name: ownerName,
    is_public: false,
    access_control: [],
    metadata: {
      ...(lead.emailaddress1 && { email: lead.emailaddress1 }),
      ...(lead.telephone1 && { phone: lead.telephone1 }),
      ...(lead.companyname && { companyName: lead.companyname }),
      ...(lead.jobtitle && { jobTitle: lead.jobtitle }),
      ...(lead.subject && { topic: lead.subject }),
      ...(lead.estimatedvalue && {
        estimatedValue: String(lead.estimatedvalue),
      }),
      status: state,
    },
  };
}
