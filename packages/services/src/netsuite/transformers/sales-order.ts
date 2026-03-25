import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuiteSalesOrder } from "../api/sales-orders";
import {
  buildNetsuiteUrl,
  formatCurrency,
  formatItemLines,
  formatRefName,
} from "./utils";

export function transformNetsuiteSalesOrder(
  order: NetsuiteSalesOrder,
  context: NetsuiteTransformContext
): GenericDocument {
  const title = order.tranId ? `SO-${order.tranId}` : `Sales Order ${order.id}`;

  const lineDescriptions = formatItemLines(order.item);

  const parts = [
    formatRefName(order.orderStatus)
      ? `Status: ${formatRefName(order.orderStatus)}`
      : null,
    formatCurrency(order.total, order.currency)
      ? `Total: ${formatCurrency(order.total, order.currency)}`
      : null,
    formatRefName(order.entity)
      ? `Customer: ${formatRefName(order.entity)}`
      : null,
    order.shipDate ? `Ship Date: ${order.shipDate}` : null,
    formatRefName(order.salesRep)
      ? `Sales Rep: ${formatRefName(order.salesRep)}`
      : null,
    formatRefName(order.department)
      ? `Dept: ${formatRefName(order.department)}`
      : null,
    order.memo ? order.memo : null,
    lineDescriptions ? `Items: ${lineDescriptions}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_sales_order_${order.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: order.id,
    document_type: "sales_order",
    document_subtype: formatRefName(order.orderStatus),
    title,
    content: parts.join(" — "),
    created_at: order.dateCreated
      ? new Date(order.dateCreated).getTime()
      : Date.now(),
    updated_at: order.lastModifiedDate
      ? new Date(order.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "salesord", order.id),
    author_name: formatRefName(order.salesRep),
    is_public: false,
    access_control: [],
    metadata: {
      ...(order.tranId && { orderNumber: order.tranId }),
      ...(formatRefName(order.orderStatus) && {
        status: formatRefName(order.orderStatus) as string,
      }),
      ...(order.total !== undefined && { total: String(order.total) }),
      ...(formatRefName(order.currency) && {
        currency: formatRefName(order.currency) as string,
      }),
      ...(formatRefName(order.entity) && {
        customerName: formatRefName(order.entity) as string,
      }),
    },
  };
}
