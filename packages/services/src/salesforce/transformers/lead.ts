import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";

export type SalesforceLead = {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Company?: string;
  Title?: string;
  Status: string;
  LeadSource?: string;
  Industry?: string;
  Description?: string;
  Owner?: { Name?: string };
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
};

export function transformSalesforceLead(
  lead: SalesforceLead,
  context: SalesforceTransformContext
): GenericDocument {
  const parts = [
    lead.Company ? `Company: ${lead.Company}` : null,
    lead.Title,
    `Status: ${lead.Status}`,
    lead.Description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(lead.CreatedDate).getTime();
  const updatedAt = new Date(lead.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_lead_${lead.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: lead.Id,
    document_type: "lead",
    document_subtype: "lead",
    title: lead.Name,
    content,
    author_name: lead.Owner?.Name,
    author_email: lead.Email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${lead.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      status: lead.Status,
      ...(lead.Email && { email: lead.Email }),
      ...(lead.Phone && { phone: lead.Phone }),
      ...(lead.Company && { company: lead.Company }),
      ...(lead.Title && { title: lead.Title }),
      ...(lead.LeadSource && { leadSource: lead.LeadSource }),
      ...(lead.Industry && { industry: lead.Industry }),
    },
  };
}
