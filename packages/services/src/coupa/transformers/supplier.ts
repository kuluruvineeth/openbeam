import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaSupplier } from "../api/suppliers";
import { buildCoupaUrl, formatCoupaAddress } from "./utils";

export function transformCoupaSupplier(
  supplier: CoupaSupplier,
  context: CoupaTransformContext
): GenericDocument {
  const contactName = supplier["primary-contact"]
    ? [
        supplier["primary-contact"]["name-given"],
        supplier["primary-contact"]["name-family"],
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  const parts = [
    supplier.status ? `Status: ${supplier.status}` : null,
    supplier.number ? `Supplier #: ${supplier.number}` : null,
    supplier["payment-term"]
      ? `Payment Terms: ${supplier["payment-term"].code}`
      : null,
    contactName ? `Contact: ${contactName}` : null,
    supplier["primary-contact"]?.email
      ? `Email: ${supplier["primary-contact"].email}`
      : null,
    formatCoupaAddress(supplier["primary-address"])
      ? `Address: ${formatCoupaAddress(supplier["primary-address"])}`
      : null,
    supplier.website ? `Website: ${supplier.website}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_supplier_${supplier.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(supplier.id),
    document_type: "supplier",
    document_subtype: supplier.status,
    title: supplier.name,
    content: parts.join(" — "),
    created_at: new Date(supplier["created-at"]).getTime(),
    updated_at: new Date(supplier["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "suppliers", supplier.id),
    author_name: contactName ?? undefined,
    author_email: supplier["primary-contact"]?.email,
    is_public: false,
    access_control: [],
    metadata: {
      ...(supplier.number && { supplierNumber: supplier.number }),
      ...(supplier.status && { status: supplier.status }),
      ...(supplier["tax-id"] && { taxId: supplier["tax-id"] }),
      ...(supplier.website && { website: supplier.website }),
    },
  };
}
