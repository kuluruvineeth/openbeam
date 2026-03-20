import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";

export type SalesforceContact = {
  Id: string;
  FirstName?: string;
  LastName: string;
  Name: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  Account?: { Name?: string; Id?: string };
  Owner?: { Name?: string };
  Description?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  SystemModstamp: string;
};

export function transformSalesforceContact(
  contact: SalesforceContact,
  context: SalesforceTransformContext
): GenericDocument {
  const parts = [
    contact.Title,
    contact.Department,
    contact.Account?.Name ? `at ${contact.Account.Name}` : null,
    contact.Description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(contact.CreatedDate).getTime();
  const updatedAt = new Date(contact.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_contact_${contact.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: contact.Id,
    document_type: "contact",
    document_subtype: "contact",
    title: contact.Name,
    content,
    author_email: contact.Email,
    author_name: contact.Name,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${contact.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(contact.Email && { email: contact.Email }),
      ...(contact.Phone && { phone: contact.Phone }),
      ...(contact.Title && { title: contact.Title }),
      ...(contact.Department && { department: contact.Department }),
      ...(contact.Account?.Name && { accountName: contact.Account.Name }),
    },
  };
}
