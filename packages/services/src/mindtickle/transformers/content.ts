import type { MindtickleTransformContext } from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtickleContent } from "../api/content";
import { stripHtml } from "./utils";

function buildContentBody(item: MindtickleContent): string {
  const parts: string[] = [];

  if (item.description) {
    parts.push(stripHtml(item.description));
  }

  parts.push(`Type: ${item.content_type}`);

  if (item.category) {
    parts.push(`Category: ${item.category}`);
  }

  if (item.file_size > 0) {
    const sizeMb = (item.file_size / (1024 * 1024)).toFixed(1);
    parts.push(`File Size: ${sizeMb} MB`);
  }

  if (item.tags.length > 0) {
    parts.push(`Tags: ${item.tags.join(", ")}`);
  }

  if (item.uploaded_by) {
    parts.push(`Uploaded by: ${item.uploaded_by.name}`);
  }

  return parts.join("\n");
}

export async function transformContent(
  item: MindtickleContent,
  context: MindtickleTransformContext
): Promise<GenericDocument> {
  const title = item.title;
  const content = buildContentBody(item);
  const metadata: GenericDocument["metadata"] = {
    contentType: item.content_type,
    category: item.category,
    fileSize: String(item.file_size),
    ...(item.tags.length > 0 && {
      tags: item.tags.join(", "),
    }),
    ...(item.uploaded_by && {
      uploadedBy: item.uploaded_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_content_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: "content",
    document_subtype: item.content_type,
    title,
    content,
    created_at: new Date(item.created_at).getTime(),
    updated_at: new Date(item.updated_at).getTime(),
    source_type: "mindtickle",
    url: item.file_url ?? `https://app.mindtickle.com/content/${item.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: item.uploaded_by?.name,
    author_email: item.uploaded_by?.email,
  };
}
