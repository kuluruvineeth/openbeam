import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuiteCustomer } from "../api/customers";
import { buildNetsuiteUrl, formatCurrency, formatRefName } from "./utils";

export function transformNetsuiteCustomer(
  customer: NetsuiteCustomer,
  context: NetsuiteTransformContext
): GenericDocument {
  const name = customer.companyName ?? customer.entityId ?? customer.id;

  const parts = [
    formatRefName(customer.entityStatus)
      ? `Status: ${formatRefName(customer.entityStatus)}`
      : null,
    customer.email ? `Email: ${customer.email}` : null,
    customer.phone ? `Phone: ${customer.phone}` : null,
    formatCurrency(customer.balance, customer.currency),
    formatRefName(customer.subsidiary)
      ? `Subsidiary: ${formatRefName(customer.subsidiary)}`
      : null,
    formatRefName(customer.salesRep)
      ? `Sales Rep: ${formatRefName(customer.salesRep)}`
      : null,
    customer.defaultAddress ? `Address: ${customer.defaultAddress}` : null,
    customer.comments ? customer.comments : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_customer_${customer.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: customer.id,
    document_type: "customer",
    document_subtype: formatRefName(customer.entityStatus),
    title: name,
    content: parts.join(" — "),
    created_at: customer.dateCreated
      ? new Date(customer.dateCreated).getTime()
      : Date.now(),
    updated_at: customer.lastModifiedDate
      ? new Date(customer.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "custjob", customer.id),
    author_name: formatRefName(customer.salesRep),
    is_public: false,
    access_control: [],
    metadata: {
      ...(customer.entityId && { entityId: customer.entityId }),
      ...(formatRefName(customer.entityStatus) && {
        status: formatRefName(customer.entityStatus) as string,
      }),
      ...(customer.email && { email: customer.email }),
      ...(customer.balance !== undefined && {
        balance: String(customer.balance),
      }),
      ...(formatRefName(customer.currency) && {
        currency: formatRefName(customer.currency) as string,
      }),
      ...(formatRefName(customer.subsidiary) && {
        subsidiary: formatRefName(customer.subsidiary) as string,
      }),
    },
  };
}
