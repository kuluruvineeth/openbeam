import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoCampaign } from "../api/campaigns";
import { buildMarketoUrl } from "./utils";

export function transformMarketoCampaign(
  campaign: MarketoCampaign,
  context: MarketoTransformContext
): GenericDocument {
  const parts = [
    campaign.description ?? null,
    campaign.type ? `Type: ${campaign.type}` : null,
    campaign.programName ? `Program: ${campaign.programName}` : null,
    campaign.workspaceName ? `Workspace: ${campaign.workspaceName}` : null,
    `Active: ${campaign.active ? "Yes" : "No"}`,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(campaign.createdAt).getTime();
  const updatedAt = new Date(campaign.updatedAt).getTime();

  return {
    id: `${context.connectorId}_campaign_${campaign.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(campaign.id),
    document_type: "campaign",
    document_subtype: campaign.type,
    title: campaign.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildMarketoUrl(context.munchkinId, "SC", campaign.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(campaign.type && { campaignType: campaign.type }),
      ...(campaign.programName && { programName: campaign.programName }),
      ...(campaign.programId && { programId: String(campaign.programId) }),
      ...(campaign.workspaceName && { workspace: campaign.workspaceName }),
      active: String(campaign.active),
    },
  };
}
