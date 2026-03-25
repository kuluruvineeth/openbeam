import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuitePurchaseOrder } from "../api/purchase-orders";
import {
  buildNetsuiteUrl,
  formatCurrency,
  formatItemLines,
  formatRefName,
} from "./utils";

export function transformNetsuitePurchaseOrder(
  po: NetsuitePurchaseOrder,
  context: NetsuiteTransformContext
): GenericDocument {
  const title = po.tranId ? `PO-${po.tranId}` : `Purchase Order ${po.id}`;

  const lineDescriptions = formatItemLines(po.item);

  const parts = [
    formatRefName(po.status) ? `Status: ${formatRefName(po.status)}` : null,
    formatCurrency(po.total, po.currency)
      ? `Total: ${formatCurrency(po.total, po.currency)}`
      : null,
    formatRefName(po.entity) ? `Vendor: ${formatRefName(po.entity)}` : null,
    po.expectedReceiptDate ? `Expected: ${po.expectedReceiptDate}` : null,
    formatRefName(po.employee) ? `Buyer: ${formatRefName(po.employee)}` : null,
    formatRefName(po.department)
      ? `Dept: ${formatRefName(po.department)}`
      : null,
    po.memo ? po.memo : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_purchase_order_${po.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: po.id,
    document_type: "purchase_order",
    document_subtype: formatRefName(po.status),
    title,
    content: parts.join(" — "),
    created_at: po.dateCreated
      ? new Date(po.dateCreated).getTime()
      : Date.now(),
    updated_at: po.lastModifiedDate
      ? new Date(po.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "purchord", po.id),
    author_name: formatRefName(po.employee),
    is_public: false,
    access_control: [],
    metadata: {
      ...(po.tranId && { poNumber: po.tranId }),
      ...(formatRefName(po.status) && {
        status: formatRefName(po.status) as string,
      }),
      ...(po.total !== undefined && { total: String(po.total) }),
      ...(formatRefName(po.currency) && {
        currency: formatRefName(po.currency) as string,
      }),
      ...(formatRefName(po.entity) && {
        vendorName: formatRefName(po.entity) as string,
      }),
    },
  };
}
