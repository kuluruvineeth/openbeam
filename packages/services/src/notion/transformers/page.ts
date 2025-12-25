import type { GenericDocument, JsonArray } from "@openplane/vespa";
import type { BlockWithDepth } from "../api/blocks";
import type {
  NotionComment,
  NotionPage,
  NotionTransformContext,
} from "../types";
import { serializeBlocks } from "../utils/block-serializer";
import {
  blocksToText,
  commentsToText,
  extractAllPropertyValues,
  extractPageTitle,
  getAuthorId,
  getCoverUrl,
  getCreatedAtMs,
  getIconEmoji,
  getLastEditorId,
  getModifiedAtMs,
  getParentId,
} from "../utils/content-extractor";

export interface PageTransformOptions {
  blocks?: BlockWithDepth[];
  comments?: NotionComment[];
}

function buildPageDocumentId(connectorId: string, pageId: string): string {
  return `${connectorId}_page_${pageId}`;
}

function buildParentDocumentId(
  connectorId: string,
  page: NotionPage
): string | undefined {
  const parentId = getParentId(page.parent);
  if (!parentId) {
    return;
  }

  const parentType = page.parent.type;
  switch (parentType) {
    case "page_id":
      return `${connectorId}_page_${parentId}`;
    case "database_id":
      return `${connectorId}_database_${parentId}`;
    default:
      return;
  }
}

function buildPageContent(
  page: NotionPage,
  options: PageTransformOptions
): string {
  const parts: string[] = [];

  const propertyValues = extractAllPropertyValues(
    page.properties as Record<string, unknown>
  );
  for (const [name, value] of Object.entries(propertyValues)) {
    if (name.toLowerCase() !== "title" && value) {
      parts.push(`${name}: ${value}`);
    }
  }

  if (options.blocks?.length) {
    parts.push(blocksToText(options.blocks));
  }

  if (options.comments?.length) {
    parts.push("\n--- Comments ---");
    parts.push(commentsToText(options.comments));
  }

  return parts.join("\n");
}

function buildPageMetadata(
  page: NotionPage,
  options: PageTransformOptions
): GenericDocument["metadata"] {
  const icon = getIconEmoji(page);
  const cover = getCoverUrl(page);
  const lastEditorId = getLastEditorId(page);
  const propertyValues = extractAllPropertyValues(
    page.properties as Record<string, unknown>
  );

  return {
    pageId: page.id,
    ...(icon && { icon }),
    ...(cover && { coverUrl: cover }),
    ...(lastEditorId && { lastEditorId }),
    ...(page.archived && { archived: true }),
    ...(page.in_trash && { inTrash: true }),
    ...(page.public_url && { publicUrl: page.public_url }),
    ...(options.blocks && { blockCount: options.blocks.length }),
    ...(options.blocks && {
      blocks: serializeBlocks(options.blocks) as unknown as JsonArray,
    }),
    ...(options.comments && { commentCount: options.comments.length }),
    ...propertyValues,
  };
}

export function transformPage(
  page: NotionPage,
  context: NotionTransformContext,
  options: PageTransformOptions = {}
): GenericDocument {
  const title = extractPageTitle(page);
  const content = buildPageContent(page, options);
  const authorId = getAuthorId(page);
  const authorName = authorId
    ? context.userLookup?.getName(authorId)
    : undefined;
  const authorAvatarUrl = authorId
    ? context.userLookup?.getAvatar(authorId)
    : undefined;

  const isPublic = !!page.public_url;

  return {
    id: buildPageDocumentId(context.connectorId, page.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.id,
    document_type: "page",
    document_subtype:
      page.parent.type === "database_id" ? "database_entry" : "page",
    title,
    content,
    author_id: authorId,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    created_at: getCreatedAtMs(page),
    updated_at: getModifiedAtMs(page),
    source_id:
      page.parent.type === "database_id"
        ? getParentId(page.parent)
        : context.workspaceId,
    source_type: "notion",
    source_name: context.workspaceName,
    parent_id: buildParentDocumentId(context.connectorId, page),
    url: page.url,
    is_public: isPublic,
    access_control: isPublic ? undefined : [`team:${context.teamId}`],
    metadata: buildPageMetadata(page, options),
  };
}

export function transformPages(
  pages: NotionPage[],
  context: NotionTransformContext,
  options: PageTransformOptions = {}
): GenericDocument[] {
  return pages.map((page) => transformPage(page, context, options));
}
