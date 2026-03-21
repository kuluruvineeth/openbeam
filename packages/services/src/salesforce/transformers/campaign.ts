import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";

export type SalesforceCampaign = {
  Id: string;
  Name: string;
  Description?: string;
  Status?: string;
  Type?: string;
  StartDate?: string;
  EndDate?: string;
  NumberOfLeads?: number;
  NumberOfContacts?: number;
  ActualCost?: number;
  BudgetedCost?: number;
  Owner?: { Name?: string };
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
};

export function transformSalesforceCampaign(
  campaign: SalesforceCampaign,
  context: SalesforceTransformContext
): GenericDocument {
  const parts = [
    campaign.Status ? `Status: ${campaign.Status}` : null,
    campaign.Type ? `Type: ${campaign.Type}` : null,
    campaign.Description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(campaign.CreatedDate).getTime();
  const updatedAt = new Date(campaign.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_campaign_${campaign.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: campaign.Id,
    document_type: "campaign",
    document_subtype: "campaign",
    title: campaign.Name,
    content,
    author_name: campaign.Owner?.Name,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${campaign.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(campaign.Status && { status: campaign.Status }),
      ...(campaign.Type && { campaignType: campaign.Type }),
      ...(campaign.StartDate && { startDate: campaign.StartDate }),
      ...(campaign.EndDate && { endDate: campaign.EndDate }),
      ...(campaign.NumberOfLeads !== undefined && {
        numberOfLeads: campaign.NumberOfLeads,
      }),
      ...(campaign.NumberOfContacts !== undefined && {
        numberOfContacts: campaign.NumberOfContacts,
      }),
      ...(campaign.ActualCost !== undefined && {
        actualCost: campaign.ActualCost,
      }),
      ...(campaign.BudgetedCost !== undefined && {
        budgetedCost: campaign.BudgetedCost,
      }),
    },
  };
}
