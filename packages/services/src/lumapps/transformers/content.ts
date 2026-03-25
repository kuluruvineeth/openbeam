import type { LumAppsTransformContext } from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LumAppsContent } from "../api/contents";
import { buildLumAppsContentUrl, stripHtml } from "./utils";

function buildContentBody(content: LumAppsContent): string {
  const parts: string[] = [];

  if (content.excerpt) {
    parts.push(stripHtml(content.excerpt));
  }

  if (content.content) {
    parts.push(stripHtml(content.content));
  }

  parts.push(`Type: ${content.type}`);
  parts.push(`Status: ${content.status}`);

  if (content.space?.name) {
    parts.push(`Space: ${content.space.name}`);
  }

  if (content.tags?.length) {
    parts.push(`Tags: ${content.tags.join(", ")}`);
  }

  if (content.language) {
    parts.push(`Language: ${content.language}`);
  }

  return parts.join("\n");
}

function buildContentMetadata(
  content: LumAppsContent
): GenericDocument["metadata"] {
  return {
    contentId: content.id,
    contentType: content.type,
    status: content.status,
    ...(content.slug && { slug: content.slug }),
    ...(content.space?.id && { spaceId: content.space.id }),
    ...(content.space?.name && { spaceName: content.space.name }),
    ...(content.tags?.length && { tags: content.tags.join(", ") }),
    ...(content.language && { language: content.language }),
    ...(content.publicationDate && {
      publicationDate: content.publicationDate,
    }),
  };
}

export async function transformContent(
  content: LumAppsContent,
  context: LumAppsTransformContext
): Promise<GenericDocument> {
  const title = content.title;
  const body = buildContentBody(content);
  const metadata = buildContentMetadata(content);

  const checksum = await calculateDocumentChecksum({
    title,
    content: body,
    metadata,
  });

  const createdAt = new Date(content.createdAt).getTime();
  const updatedAt = new Date(content.updatedAt).getTime();

  return {
    id: `${context.connectorId}_content_${content.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: content.id,
    document_type: "content",
    document_subtype: content.type,
    title,
    content: body,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "lumapps",
    url: content.url ?? buildLumAppsContentUrl(content.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: content.author?.fullName,
  };
}
