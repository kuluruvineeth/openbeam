import type { SalesforceTransformContext } from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type SalesforceCase = {
  Id: string;
  CaseNumber: string;
  Subject?: string;
  Description?: string;
  Status: string;
  Priority?: string;
  Type?: string;
  Reason?: string;
  Origin?: string;
  Contact?: { Name?: string; Email?: string };
  Account?: { Name?: string };
  Owner?: { Name?: string; Email?: string };
  CreatedDate: string;
  LastModifiedDate: string;
  ClosedDate?: string;
  SystemModstamp: string;
  IsClosed: boolean;
};

export function transformSalesforceCase(
  sfCase: SalesforceCase,
  context: SalesforceTransformContext
): GenericDocument {
  const description = sfCase.Description ? stripHtml(sfCase.Description) : "";

  const parts = [
    `Status: ${sfCase.Status}`,
    sfCase.Priority ? `Priority: ${sfCase.Priority}` : null,
    sfCase.Account?.Name ? `Account: ${sfCase.Account.Name}` : null,
    description,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(sfCase.CreatedDate).getTime();
  const updatedAt = new Date(sfCase.LastModifiedDate).getTime();

  return {
    id: `${context.connectorId}_case_${sfCase.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: sfCase.Id,
    document_type: "case",
    document_subtype: (sfCase.Type ?? "case").toLowerCase(),
    title: sfCase.Subject
      ? `[${sfCase.CaseNumber}] ${sfCase.Subject}`
      : `Case ${sfCase.CaseNumber}`,
    content,
    author_name: sfCase.Contact?.Name ?? sfCase.Owner?.Name,
    author_email: sfCase.Contact?.Email ?? sfCase.Owner?.Email,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.instanceUrl}/${sfCase.Id}`,
    is_public: false,
    access_control: [],
    metadata: {
      caseNumber: sfCase.CaseNumber,
      status: sfCase.Status,
      ...(sfCase.Priority && { priority: sfCase.Priority }),
      ...(sfCase.Type && { caseType: sfCase.Type }),
      ...(sfCase.Reason && { reason: sfCase.Reason }),
      ...(sfCase.Origin && { origin: sfCase.Origin }),
      ...(sfCase.Account?.Name && { accountName: sfCase.Account.Name }),
      isClosed: sfCase.IsClosed,
    },
  };
}
