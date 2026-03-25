import type { NetsuiteTransformContext } from "@openbeam/types/services/connectors/netsuite";
import type { GenericDocument } from "@openbeam/vespa";
import type { NetsuiteVendor } from "../api/vendors";
import { buildNetsuiteUrl, formatCurrency, formatRefName } from "./utils";

export function transformNetsuiteVendor(
  vendor: NetsuiteVendor,
  context: NetsuiteTransformContext
): GenericDocument {
  const name = vendor.companyName ?? vendor.entityId ?? vendor.id;

  const parts = [
    formatRefName(vendor.entityStatus)
      ? `Status: ${formatRefName(vendor.entityStatus)}`
      : null,
    vendor.email ? `Email: ${vendor.email}` : null,
    vendor.phone ? `Phone: ${vendor.phone}` : null,
    formatCurrency(vendor.balance, vendor.currency),
    formatRefName(vendor.terms)
      ? `Terms: ${formatRefName(vendor.terms)}`
      : null,
    formatRefName(vendor.subsidiary)
      ? `Subsidiary: ${formatRefName(vendor.subsidiary)}`
      : null,
    vendor.defaultAddress ? `Address: ${vendor.defaultAddress}` : null,
    vendor.comments ? vendor.comments : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_vendor_${vendor.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: vendor.id,
    document_type: "vendor",
    document_subtype: formatRefName(vendor.entityStatus),
    title: name,
    content: parts.join(" — "),
    created_at: vendor.dateCreated
      ? new Date(vendor.dateCreated).getTime()
      : Date.now(),
    updated_at: vendor.lastModifiedDate
      ? new Date(vendor.lastModifiedDate).getTime()
      : Date.now(),
    url: buildNetsuiteUrl(context.accountId, "vendor", vendor.id),
    author_name: undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(vendor.entityId && { entityId: vendor.entityId }),
      ...(formatRefName(vendor.entityStatus) && {
        status: formatRefName(vendor.entityStatus) as string,
      }),
      ...(vendor.email && { email: vendor.email }),
      ...(vendor.balance !== undefined && {
        balance: String(vendor.balance),
      }),
      ...(formatRefName(vendor.currency) && {
        currency: formatRefName(vendor.currency) as string,
      }),
      ...(formatRefName(vendor.terms) && {
        paymentTerms: formatRefName(vendor.terms) as string,
      }),
    },
  };
}
