import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaPurchaseOrder } from "../api/purchase-orders";
import { buildCoupaUrl, formatCoupaAddress } from "./utils";

export function transformCoupaPurchaseOrder(
  po: CoupaPurchaseOrder,
  context: CoupaTransformContext
): GenericDocument {
  const lineDescriptions = (po["order-lines"] ?? [])
    .map((l) => l.description)
    .filter(Boolean)
    .join("; ");

  const parts = [
    po.status ? `Status: ${po.status}` : null,
    po["total-with-tax"]
      ? `Total: ${po["total-with-tax"]} ${po.currency?.code ?? ""}`
      : null,
    po.supplier ? `Supplier: ${po.supplier.name}` : null,
    po["requested-by"]?.fullname
      ? `Requester: ${po["requested-by"].fullname}`
      : null,
    formatCoupaAddress(po["ship-to-address"])
      ? `Ship to: ${formatCoupaAddress(po["ship-to-address"])}`
      : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_purchase_order_${po.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(po.id),
    document_type: "purchase_order",
    document_subtype: po.status,
    title: `PO-${po["po-number"]}`,
    content: parts.join(" — "),
    created_at: new Date(po["created-at"]).getTime(),
    updated_at: new Date(po["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "purchase_orders", po.id),
    author_name: po["requested-by"]?.fullname,
    is_public: false,
    access_control: [],
    metadata: {
      ...(po["po-number"] && { poNumber: po["po-number"] }),
      ...(po.status && { status: po.status }),
      ...(po["total-with-tax"] && { total: po["total-with-tax"] }),
      ...(po.currency?.code && { currency: po.currency.code }),
      ...(po.supplier && { supplierName: po.supplier.name }),
    },
  };
}
