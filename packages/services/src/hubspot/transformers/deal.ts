import type { HubSpotTransformContext } from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HubSpotDeal } from "../api/deals";

const PORTAL_URL = "https://app.hubspot.com/contacts";

export function transformHubSpotDeal(
  deal: HubSpotDeal,
  context: HubSpotTransformContext
): GenericDocument {
  const p = deal.properties;
  const name = p.dealname || deal.id;

  const parts = [
    p.description,
    p.dealstage ? `Stage: ${p.dealstage}` : null,
    p.amount ? `Amount: ${p.amount}` : null,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(deal.createdAt).getTime();
  const updatedAt = new Date(deal.updatedAt).getTime();

  return {
    id: `${context.connectorId}_deal_${deal.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: deal.id,
    document_type: "deal",
    document_subtype: (p.pipeline ?? "deal").toLowerCase(),
    title: name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${PORTAL_URL}/${context.portalId}/deal/${deal.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(p.amount && { amount: p.amount }),
      ...(p.dealstage && { stage: p.dealstage }),
      ...(p.pipeline && { pipeline: p.pipeline }),
      ...(p.closedate && { closeDate: p.closedate }),
      ...(p.hs_deal_stage_probability && {
        probability: p.hs_deal_stage_probability,
      }),
    },
  };
}
