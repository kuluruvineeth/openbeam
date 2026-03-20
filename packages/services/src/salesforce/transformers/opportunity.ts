import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";

export type SalesforceOpportunity = {
  Id: string;
  Name: string;
  Description?: string;
  StageName: string;
  Amount?: number;
  Probability?: number;
  CloseDate: string;
  Type?: string;
  LeadSource?: string;
  Account?: { Name?: string; Id?: string };
  Owner?: { Name?: string; Email?: string };
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
  IsClosed: boolean;
  IsWon: boolean;
};

export function transformSalesforceOpportunity(
  opp: SalesforceOpportunity,
  context: SalesforceTransformContext
): GenericDocument {
  const parts = [
    `Stage: ${opp.StageName}`,
    opp.Amount ? `$${opp.Amount.toLocaleString()}` : null,
    opp.Account?.Name ? `Account: ${opp.Account.Name}` : null,
    opp.Description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(opp.CreatedDate).getTime();
  const updatedAt = new Date(opp.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_opportunity_${opp.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: opp.Id,
    document_type: "opportunity",
    document_subtype: opp.IsClosed ? (opp.IsWon ? "won" : "lost") : "open",
    title: opp.Name,
    content,
    author_name: opp.Owner?.Name,
    author_email: opp.Owner?.Email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${opp.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      stage: opp.StageName,
      ...(opp.Amount !== undefined && { amount: opp.Amount }),
      ...(opp.Probability !== undefined && { probability: opp.Probability }),
      closeDate: opp.CloseDate,
      ...(opp.Type && { opportunityType: opp.Type }),
      ...(opp.LeadSource && { leadSource: opp.LeadSource }),
      ...(opp.Account?.Name && { accountName: opp.Account.Name }),
      isClosed: opp.IsClosed,
      isWon: opp.IsWon,
    },
  };
}
