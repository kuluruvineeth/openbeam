import type { GreenhouseTransformContext } from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { GreenhouseOffer } from "../client";

function buildOfferContent(offer: GreenhouseOffer): string {
  const parts: string[] = [];
  parts.push(`Offer #${offer.id}`);
  parts.push(`Status: ${offer.status}`);

  if (offer.starts_at) {
    parts.push(`Start Date: ${offer.starts_at}`);
  }

  parts.push(`Version: ${offer.version}`);

  if (offer.sent_at) {
    parts.push(`Sent: ${offer.sent_at}`);
  }

  if (offer.resolved_at) {
    parts.push(`Resolved: ${offer.resolved_at}`);
  }

  return parts.join("\n");
}

export async function transformOffer(
  offer: GreenhouseOffer,
  ctx: GreenhouseTransformContext
): Promise<GenericDocument> {
  const title = `Offer #${offer.id} (${offer.status})`;
  const content = buildOfferContent(offer);

  const metadata: GenericDocument["metadata"] = {
    status: offer.status,
    applicationId: offer.application_id,
    version: offer.version,
  };

  if (offer.starts_at) {
    metadata.startsAt = offer.starts_at;
  }

  if (offer.sent_at) {
    metadata.sentAt = offer.sent_at;
  }

  if (offer.resolved_at) {
    metadata.resolvedAt = offer.resolved_at;
  }

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_offer_${offer.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: String(offer.id),
    document_type: "offer",
    document_subtype: offer.status,
    title,
    content,
    created_at: new Date(offer.created_at).getTime(),
    updated_at: offer.resolved_at
      ? new Date(offer.resolved_at).getTime()
      : new Date(offer.created_at).getTime(),
    source_type: "greenhouse",
    url: `https://app.greenhouse.io/sdash/applications/${offer.application_id}`,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    metadata,
    checksum,
  };
}
