import type { KlueTransformContext } from "@openbeam/types/services/connectors/klue";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { KlueIntel } from "../api/intel";
import { stripHtml } from "./utils";

function buildIntelContent(intel: KlueIntel): string {
  const parts: string[] = [];

  if (intel.content) {
    parts.push(stripHtml(intel.content));
  }

  parts.push(`Type: ${intel.intel_type}`);
  parts.push(`Source: ${intel.source}`);

  if (intel.competitor_names.length > 0) {
    parts.push(`Competitors: ${intel.competitor_names.join(", ")}`);
  }

  if (intel.tags.length > 0) {
    parts.push(`Tags: ${intel.tags.join(", ")}`);
  }

  if (intel.submitted_by) {
    parts.push(`Submitted by: ${intel.submitted_by.name}`);
  }

  return parts.join("\n");
}

export async function transformIntel(
  intel: KlueIntel,
  context: KlueTransformContext
): Promise<GenericDocument> {
  const title = intel.title;
  const content = buildIntelContent(intel);
  const metadata: GenericDocument["metadata"] = {
    source: intel.source,
    intelType: intel.intel_type,
    ...(intel.source_url && { sourceUrl: intel.source_url }),
    ...(intel.competitor_names.length > 0 && {
      competitors: intel.competitor_names.join(", "),
    }),
    ...(intel.competitor_ids.length > 0 && {
      competitorIds: intel.competitor_ids.join(", "),
    }),
    ...(intel.tags.length > 0 && {
      tags: intel.tags.join(", "),
    }),
    ...(intel.submitted_by && {
      submittedBy: intel.submitted_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_intel_${intel.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: intel.id,
    document_type: "intel",
    document_subtype: intel.intel_type,
    title,
    content,
    created_at: new Date(intel.created_at).getTime(),
    updated_at: new Date(intel.updated_at).getTime(),
    source_type: "klue",
    url: intel.source_url ?? `https://app.klue.com/intel/${intel.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: intel.submitted_by?.name,
    author_email: intel.submitted_by?.email,
  };
}
