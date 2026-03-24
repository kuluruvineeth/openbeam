import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestInvoice } from "../api/invoices";

export function transformHarvestInvoice(
  invoice: HarvestInvoice,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    `Client: ${invoice.client.name}`,
    `Amount: ${invoice.amount} ${invoice.currency}`,
    `Due: ${invoice.due_amount} ${invoice.currency}`,
    `Status: ${invoice.state}`,
    `Issue date: ${invoice.issue_date}`,
    `Due date: ${invoice.due_date}`,
    invoice.subject || null,
    invoice.notes || null,
  ].filter(Boolean);

  const title = `Invoice #${invoice.number} - ${invoice.client.name}`;

  return {
    id: `${context.connectorId}_invoice_${invoice.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(invoice.id),
    document_type: "invoice",
    document_subtype: invoice.state,
    title,
    content: parts.join(" — "),
    created_at: new Date(invoice.created_at).getTime(),
    updated_at: new Date(invoice.updated_at).getTime(),
    url: `${context.baseUrl}/invoices/${invoice.id}`,
    author_name: invoice.creator.name,
    is_public: false,
    access_control: [],
    metadata: {
      invoiceNumber: invoice.number,
      clientName: invoice.client.name,
      amount: String(invoice.amount),
      dueAmount: String(invoice.due_amount),
      currency: invoice.currency,
      state: invoice.state,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      ...(invoice.subject && { subject: invoice.subject }),
      ...(invoice.paid_date && { paidDate: invoice.paid_date }),
      ...(invoice.purchase_order && {
        purchaseOrder: invoice.purchase_order,
      }),
    },
  };
}
