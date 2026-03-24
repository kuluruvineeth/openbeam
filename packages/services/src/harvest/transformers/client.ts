import type { HarvestTransformContext } from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import type { HarvestApiClient } from "../api/clients";

export function transformHarvestClient(
  harvestClient: HarvestApiClient,
  context: HarvestTransformContext
): GenericDocument {
  const parts = [
    `Currency: ${harvestClient.currency}`,
    harvestClient.is_active ? "Active" : "Archived",
    harvestClient.address || null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_client_${harvestClient.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(harvestClient.id),
    document_type: "client",
    document_subtype: harvestClient.is_active ? "active" : "archived",
    title: harvestClient.name,
    content: parts.join(" — "),
    created_at: new Date(harvestClient.created_at).getTime(),
    updated_at: new Date(harvestClient.updated_at).getTime(),
    url: `${context.baseUrl}/clients/${harvestClient.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      currency: harvestClient.currency,
      active: String(harvestClient.is_active),
      ...(harvestClient.address && { address: harvestClient.address }),
    },
  };
}
