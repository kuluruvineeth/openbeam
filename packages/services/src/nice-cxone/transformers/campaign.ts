import type { NiceCxoneTransformContext } from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import type { CxoneCampaign } from "../api/campaigns";
import { buildCxoneUrl } from "./utils";

export function transformCxoneCampaign(
  campaign: CxoneCampaign,
  context: NiceCxoneTransformContext
): GenericDocument {
  const skillNames = (campaign.skills ?? [])
    .map((s) => s.skillName)
    .filter(Boolean)
    .join(", ");

  const parts = [
    campaign.description ?? null,
    campaign.isActive ? "Status: Active" : "Status: Inactive",
    campaign.isDialer ? "Type: Dialer" : null,
    skillNames ? `Skills: ${skillNames}` : null,
    campaign.notes ?? null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_campaign_${campaign.campaignId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(campaign.campaignId),
    document_type: "campaign",
    document_subtype: campaign.isDialer ? "dialer" : "standard",
    title: campaign.campaignName,
    content: parts.join(" — "),
    created_at: campaign.lastUpdateTime
      ? new Date(campaign.lastUpdateTime).getTime()
      : Date.now(),
    updated_at: campaign.lastUpdateTime
      ? new Date(campaign.lastUpdateTime).getTime()
      : Date.now(),
    url: buildCxoneUrl(context.baseUrl, "campaigns", campaign.campaignId),
    is_public: false,
    access_control: [],
    metadata: {
      isActive: String(campaign.isActive),
      ...(campaign.isDialer !== undefined && {
        isDialer: String(campaign.isDialer),
      }),
    },
  };
}
