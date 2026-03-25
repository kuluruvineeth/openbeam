import type { MindtouchTransformContext } from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtouchTag } from "../api/tags";
import { buildMindtouchUrl } from "./utils";

function buildTagContent(tag: MindtouchTag): string {
  const parts: string[] = [];

  parts.push(tag["@value"]);

  if (tag.type) {
    parts.push(`Type: ${tag.type}`);
  }

  const pageCount = tag.pages?.["@totalcount"];
  if (pageCount) {
    parts.push(`Pages: ${pageCount}`);
  }

  return parts.join("\n");
}

export async function transformTag(
  tag: MindtouchTag,
  context: MindtouchTransformContext
): Promise<GenericDocument> {
  const title = tag.title ?? tag["@value"];
  const content = buildTagContent(tag);

  const metadata: GenericDocument["metadata"] = {
    tagId: tag["@id"],
    tagValue: tag["@value"],
    tagType: tag.type ?? "text",
    ...(tag.pages && { pageCount: tag.pages["@totalcount"] }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const tagUrl = tag.uri
    ? tag.uri
    : buildMindtouchUrl(
        context.instanceUrl,
        `/Special:Tags?tag=${encodeURIComponent(tag["@value"])}`
      );

  return {
    id: `${context.connectorId}_tag_${tag["@id"]}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag["@id"],
    document_type: "tag",
    document_subtype: tag.type ?? "text",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "mindtouch",
    url: tagUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
