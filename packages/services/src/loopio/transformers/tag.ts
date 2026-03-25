import type { LoopioTransformContext } from "@openbeam/types/services/connectors/loopio";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LoopioTag } from "../api/tags";

function buildTagContent(tag: LoopioTag): string {
  const parts: string[] = [];

  parts.push(`Tag: ${tag.name}`);

  if (tag.entry_count > 0) {
    parts.push(`Library Entries: ${tag.entry_count}`);
  }

  return parts.join("\n");
}

export async function transformTag(
  tag: LoopioTag,
  context: LoopioTransformContext
): Promise<GenericDocument> {
  const title = tag.name;
  const content = buildTagContent(tag);
  const metadata: GenericDocument["metadata"] = {
    entryCount: String(tag.entry_count),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_tag_${tag.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag.id,
    document_type: "tag",
    title,
    content,
    created_at: new Date(tag.created_at).getTime(),
    updated_at: new Date(tag.updated_at).getTime(),
    source_type: "loopio",
    url: `https://app.loopio.com/library?tag=${encodeURIComponent(tag.name)}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
