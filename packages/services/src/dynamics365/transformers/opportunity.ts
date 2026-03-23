import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Opportunity } from "../api/opportunities";
import { buildDynamics365Url, formatOpportunityState } from "./utils";

export function transformDynamics365Opportunity(
  opp: Dynamics365Opportunity,
  context: Dynamics365TransformContext
): GenericDocument {
  const accountName = (opp as Record<string, unknown>)[
    "_parentaccountid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;
  const contactName = (opp as Record<string, unknown>)[
    "_parentcontactid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;
  const ownerName = (opp as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  const state = formatOpportunityState(opp.statecode);
  const parts = [
    opp.estimatedvalue ? `Value: ${opp.estimatedvalue}` : null,
    `Status: ${state}`,
    opp.stepname ? `Stage: ${opp.stepname}` : null,
    opp.estimatedclosedate ? `Expected Close: ${opp.estimatedclosedate}` : null,
    opp.closeprobability ? `Probability: ${opp.closeprobability}%` : null,
    accountName ? `Account: ${accountName}` : null,
    contactName ? `Contact: ${contactName}` : null,
    opp.description,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(opp.createdon).getTime();
  const updatedAt = new Date(opp.modifiedon).getTime();

  return {
    id: `${context.connectorId}_opportunity_${opp.opportunityid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: opp.opportunityid,
    document_type: "opportunity",
    document_subtype: state.toLowerCase(),
    title: opp.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(context.orgUrl, "opportunity", opp.opportunityid),
    author_name: ownerName,
    is_public: false,
    access_control: [],
    metadata: {
      ...(opp.estimatedvalue && {
        estimatedValue: String(opp.estimatedvalue),
      }),
      ...(opp.actualvalue && { actualValue: String(opp.actualvalue) }),
      ...(opp.stepname && { stage: opp.stepname }),
      ...(opp.estimatedclosedate && {
        estimatedCloseDate: opp.estimatedclosedate,
      }),
      ...(opp.closeprobability !== null && {
        probability: String(opp.closeprobability),
      }),
      ...(accountName && { accountName }),
      ...(contactName && { contactName }),
      status: state,
    },
  };
}
