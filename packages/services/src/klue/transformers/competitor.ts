import type { KlueTransformContext } from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { KlueCompetitor } from "../api/competitors";
import { stripHtml } from "./utils";

function buildCompetitorContent(competitor: KlueCompetitor): string {
  const parts: string[] = [];

  if (competitor.description) {
    parts.push(stripHtml(competitor.description));
  }

  parts.push(`Status: ${competitor.status}`);

  if (competitor.win_rate > 0) {
    parts.push(`Win Rate: ${Math.round(competitor.win_rate * 100)}%`);
  }

  if (competitor.website) {
    parts.push(`Website: ${competitor.website}`);
  }

  if (competitor.tags.length > 0) {
    parts.push(`Tags: ${competitor.tags.join(", ")}`);
  }

  if (competitor.owner) {
    parts.push(`Owner: ${competitor.owner.name}`);
  }

  return parts.join("\n");
}

export async function transformCompetitor(
  competitor: KlueCompetitor,
  context: KlueTransformContext
): Promise<GenericDocument> {
  const title = competitor.name;
  const content = buildCompetitorContent(competitor);
  const metadata: GenericDocument["metadata"] = {
    status: competitor.status,
    winRate: String(Math.round(competitor.win_rate * 100)),
    website: competitor.website,
    ...(competitor.tags.length > 0 && {
      tags: competitor.tags.join(", "),
    }),
    ...(competitor.owner && {
      owner: competitor.owner.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_competitor_${competitor.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: competitor.id,
    document_type: "competitor",
    document_subtype: competitor.status,
    title,
    content,
    created_at: new Date(competitor.created_at).getTime(),
    updated_at: new Date(competitor.updated_at).getTime(),
    source_type: "klue",
    url: `https://app.klue.com/competitors/${competitor.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: competitor.owner?.name,
    author_email: competitor.owner?.email,
  };
}
