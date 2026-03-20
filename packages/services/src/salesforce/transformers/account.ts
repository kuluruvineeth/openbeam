import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";

export type SalesforceAccount = {
  Id: string;
  Name: string;
  Description?: string;
  Industry?: string;
  Website?: string;
  Phone?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingCountry?: string;
  NumberOfEmployees?: number;
  AnnualRevenue?: number;
  Type?: string;
  Owner?: { Name?: string; Email?: string };
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
};

export function transformSalesforceAccount(
  account: SalesforceAccount,
  context: SalesforceTransformContext
): GenericDocument {
  const parts = [account.Description, account.Industry, account.Website].filter(
    Boolean
  );
  const content = parts.join(" — ");

  const createdAt = new Date(account.CreatedDate).getTime();
  const updatedAt = new Date(account.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_account_${account.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: account.Id,
    document_type: "account",
    document_subtype: (account.Type ?? "account").toLowerCase(),
    title: account.Name,
    content,
    author_name: account.Owner?.Name,
    author_email: account.Owner?.Email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${account.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(account.Industry && { industry: account.Industry }),
      ...(account.Website && { website: account.Website }),
      ...(account.Phone && { phone: account.Phone }),
      ...(account.Type && { accountType: account.Type }),
      ...(account.BillingCity && { city: account.BillingCity }),
      ...(account.BillingState && { state: account.BillingState }),
      ...(account.BillingCountry && { country: account.BillingCountry }),
      ...(account.NumberOfEmployees && {
        employees: account.NumberOfEmployees,
      }),
    },
  };
}
