import type { CoupaTransformContext } from "@openbeam/types/services/connectors/coupa";
import type { GenericDocument } from "@openbeam/vespa";
import type { CoupaContract } from "../api/contracts";
import { buildCoupaUrl } from "./utils";

export function transformCoupaContract(
  contract: CoupaContract,
  context: CoupaTransformContext
): GenericDocument {
  const parts = [
    contract.status ? `Status: ${contract.status}` : null,
    contract["start-date"] ? `Start: ${contract["start-date"]}` : null,
    contract["end-date"] ? `End: ${contract["end-date"]}` : null,
    contract["max-value"]
      ? `Max Value: ${contract["max-value"]} ${contract.currency?.code ?? ""}`
      : null,
    contract.supplier ? `Supplier: ${contract.supplier.name}` : null,
    contract.description ?? null,
    contract["contract-terms"] ?? null,
  ].filter(Boolean);

  const title = contract.number
    ? `${contract.name} (${contract.number})`
    : contract.name;

  return {
    id: `${context.connectorId}_contract_${contract.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(contract.id),
    document_type: "contract",
    document_subtype: contract.status,
    title,
    content: parts.join(" — "),
    created_at: new Date(contract["created-at"]).getTime(),
    updated_at: new Date(contract["updated-at"]).getTime(),
    url: buildCoupaUrl(context.instanceUrl, "contracts", contract.id),
    author_name: contract["created-by"]?.fullname,
    is_public: false,
    access_control: [],
    metadata: {
      ...(contract.number && { contractNumber: contract.number }),
      ...(contract.status && { status: contract.status }),
      ...(contract["start-date"] && { startDate: contract["start-date"] }),
      ...(contract["end-date"] && { endDate: contract["end-date"] }),
      ...(contract["max-value"] && { maxValue: contract["max-value"] }),
      ...(contract.currency?.code && { currency: contract.currency.code }),
      ...(contract.supplier && { supplierName: contract.supplier.name }),
    },
  };
}
