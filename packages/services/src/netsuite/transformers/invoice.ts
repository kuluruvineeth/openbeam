import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuiteInvoice } from "../api/invoices";
import {
  buildNetsuiteUrl,
  formatCurrency,
  formatItemLines,
  formatRefName,
} from "./utils";

export function transformNetsuiteInvoice(
  invoice: NetsuiteInvoice,
  context: NetsuiteTransformContext
): GenericDocument {
  const title = invoice.tranId
    ? `Invoice ${invoice.tranId}`
    : `Invoice ${invoice.id}`;

  const lineDescriptions = formatItemLines(invoice.item);

  const parts = [
    formatRefName(invoice.status)
      ? `Status: ${formatRefName(invoice.status)}`
      : null,
    formatCurrency(invoice.total, invoice.currency)
      ? `Total: ${formatCurrency(invoice.total, invoice.currency)}`
      : null,
    formatRefName(invoice.entity)
      ? `Customer: ${formatRefName(invoice.entity)}`
      : null,
    invoice.dueDate ? `Due: ${invoice.dueDate}` : null,
    invoice.amountRemaining !== undefined
      ? `Balance: ${invoice.amountRemaining}`
      : null,
    formatRefName(invoice.salesRep)
      ? `Sales Rep: ${formatRefName(invoice.salesRep)}`
      : null,
    invoice.memo ? invoice.memo : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_invoice_${invoice.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: invoice.id,
    document_type: "invoice",
    document_subtype: formatRefName(invoice.status),
    title,
    content: parts.join(" — "),
    created_at: invoice.dateCreated
      ? new Date(invoice.dateCreated).getTime()
      : Date.now(),
    updated_at: invoice.lastModifiedDate
      ? new Date(invoice.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "custinvc", invoice.id),
    author_name: formatRefName(invoice.salesRep),
    is_public: false,
    access_control: [],
    metadata: {
      ...(invoice.tranId && { invoiceNumber: invoice.tranId }),
      ...(formatRefName(invoice.status) && {
        status: formatRefName(invoice.status) as string,
      }),
      ...(invoice.total !== undefined && { total: String(invoice.total) }),
      ...(formatRefName(invoice.currency) && {
        currency: formatRefName(invoice.currency) as string,
      }),
      ...(formatRefName(invoice.entity) && {
        customerName: formatRefName(invoice.entity) as string,
      }),
      ...(invoice.dueDate && { dueDate: invoice.dueDate }),
    },
  };
}
