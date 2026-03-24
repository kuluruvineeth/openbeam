import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaInvoice } from "../api/invoices";
import { buildCoupaUrl } from "./utils";

export function transformCoupaInvoice(
  invoice: CoupaInvoice,
  context: CoupaTransformContext
): GenericDocument {
  const lineDescriptions = (invoice["invoice-lines"] ?? [])
    .map((l) => l.description)
    .filter(Boolean)
    .join("; ");

  const parts = [
    invoice.status ? `Status: ${invoice.status}` : null,
    invoice["total-with-tax"]
      ? `Total: ${invoice["total-with-tax"]} ${invoice.currency?.code ?? ""}`
      : null,
    invoice.supplier ? `Supplier: ${invoice.supplier.name}` : null,
    invoice["due-date"] ? `Due: ${invoice["due-date"]}` : null,
    invoice["payment-date"] ? `Paid: ${invoice["payment-date"]}` : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_invoice_${invoice.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(invoice.id),
    document_type: "invoice",
    document_subtype: invoice.status,
    title: `INV-${invoice["invoice-number"]}`,
    content: parts.join(" — "),
    created_at: new Date(invoice["created-at"]).getTime(),
    updated_at: new Date(invoice["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "invoices", invoice.id),
    author_name: invoice["created-by"]?.fullname,
    is_public: false,
    access_control: [],
    metadata: {
      ...(invoice["invoice-number"] && {
        invoiceNumber: invoice["invoice-number"],
      }),
      ...(invoice.status && { status: invoice.status }),
      ...(invoice["total-with-tax"] && { total: invoice["total-with-tax"] }),
      ...(invoice.currency?.code && { currency: invoice.currency.code }),
      ...(invoice.supplier && { supplierName: invoice.supplier.name }),
      ...(invoice["due-date"] && { dueDate: invoice["due-date"] }),
    },
  };
}
