import type { KlueTransformContext } from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { KlueBattlecard } from "../api/battlecards";
import { stripHtml } from "./utils";

function buildBattlecardContent(battlecard: KlueBattlecard): string {
  const parts: string[] = [];

  if (battlecard.content) {
    parts.push(stripHtml(battlecard.content));
  }

  parts.push(`Competitor: ${battlecard.competitor_name}`);
  parts.push(`Status: ${battlecard.status}`);
  parts.push(`Card Type: ${battlecard.card_type}`);

  if (battlecard.tags.length > 0) {
    parts.push(`Tags: ${battlecard.tags.join(", ")}`);
  }

  if (battlecard.last_reviewed_by) {
    parts.push(`Last Reviewed By: ${battlecard.last_reviewed_by.name}`);
  }

  if (battlecard.last_reviewed_at) {
    parts.push(
      `Last Reviewed: ${new Date(battlecard.last_reviewed_at).toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

export async function transformBattlecard(
  battlecard: KlueBattlecard,
  context: KlueTransformContext
): Promise<GenericDocument> {
  const title = battlecard.title;
  const content = buildBattlecardContent(battlecard);
  const metadata: GenericDocument["metadata"] = {
    competitorId: battlecard.competitor_id,
    competitorName: battlecard.competitor_name,
    status: battlecard.status,
    cardType: battlecard.card_type,
    ...(battlecard.tags.length > 0 && {
      tags: battlecard.tags.join(", "),
    }),
    ...(battlecard.last_reviewed_at && {
      lastReviewedAt: battlecard.last_reviewed_at,
    }),
    ...(battlecard.last_reviewed_by && {
      lastReviewedBy: battlecard.last_reviewed_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_battlecard_${battlecard.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: battlecard.id,
    document_type: "battlecard",
    document_subtype: battlecard.card_type,
    title,
    content,
    created_at: new Date(battlecard.created_at).getTime(),
    updated_at: new Date(battlecard.updated_at).getTime(),
    source_type: "klue",
    url: `https://app.klue.com/battlecards/${battlecard.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: battlecard.last_reviewed_by?.name,
  };
}
