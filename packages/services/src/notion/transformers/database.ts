import type {
  NotionDatabase,
  NotionTransformContext,
} from "@openplane/types/services/connectors/notion";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../utils/checksum";
import {
  extractDatabaseDescription,
  extractDatabaseTitle,
  getAuthorId,
  getCoverUrl,
  getCreatedAtMs,
  getIconEmoji,
  getLastEditorId,
  getModifiedAtMs,
  getParentId,
} from "../utils/content-extractor";

function buildDatabaseDocumentId(
  connectorId: string,
  databaseId: string
): string {
  return `${connectorId}_database_${databaseId}`;
}

function buildParentDocumentId(
  connectorId: string,
  database: NotionDatabase
): string | undefined {
  const parentId = getParentId(database.parent);
  if (!parentId) {
    return;
  }

  const parentType = database.parent.type;
  switch (parentType) {
    case "page_id":
      return `${connectorId}_page_${parentId}`;
    case "block_id":
      return `${connectorId}_block_${parentId}`;
    default:
      return;
  }
}

function buildDatabaseContent(database: NotionDatabase): string {
  const parts: string[] = [];

  const description = extractDatabaseDescription(database);
  if (description) {
    parts.push(description);
  }

  const propertyNames = Object.keys(database.properties);
  if (propertyNames.length > 0) {
    parts.push(`\nProperties: ${propertyNames.join(", ")}`);
  }

  return parts.join("\n");
}

function extractPropertySchema(
  database: NotionDatabase
): Record<string, { type: string; name: string }> {
  const schema: Record<string, { type: string; name: string }> = {};

  for (const [name, prop] of Object.entries(database.properties)) {
    const typedProp = prop as { id: string; type: string; name: string };
    schema[typedProp.id] = {
      type: typedProp.type,
      name,
    };
  }

  return schema;
}

function buildDatabaseMetadata(
  database: NotionDatabase
): GenericDocument["metadata"] {
  const icon = getIconEmoji(database);
  const cover = getCoverUrl(database);
  const lastEditorId = getLastEditorId(database);
  const propertySchema = extractPropertySchema(database);

  return {
    databaseId: database.id,
    propertyCount: Object.keys(database.properties).length,
    propertySchema,
    ...(icon && { icon }),
    ...(cover && { coverUrl: cover }),
    ...(lastEditorId && { lastEditorId }),
    ...(database.archived && { archived: true }),
    ...(database.in_trash && { inTrash: true }),
    ...(database.is_inline && { isInline: true }),
    ...(database.public_url && { publicUrl: database.public_url }),
  };
}

export async function transformDatabase(
  database: NotionDatabase,
  context: NotionTransformContext
): Promise<GenericDocument> {
  const title = extractDatabaseTitle(database);
  const content = buildDatabaseContent(database);
  const authorId = getAuthorId(database);
  const authorName = authorId
    ? context.userLookup?.getName(authorId)
    : undefined;
  const authorAvatarUrl = authorId
    ? context.userLookup?.getAvatar(authorId)
    : undefined;

  const isPublic = !!database.public_url;
  const metadata = buildDatabaseMetadata(database);

  const checksum = await calculateDocumentChecksum({
    title: title || "Untitled Database",
    content,
    metadata,
  });

  return {
    id: buildDatabaseDocumentId(context.connectorId, database.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: database.id,
    document_type: "database",
    title: title || "Untitled Database",
    content,
    author_id: authorId,
    author_name: authorName,
    author_avatar_url: authorAvatarUrl,
    created_at: getCreatedAtMs(database),
    updated_at: getModifiedAtMs(database),
    source_id: context.workspaceId,
    source_type: "notion",
    source_name: context.workspaceName,
    parent_id: buildParentDocumentId(context.connectorId, database),
    url: database.url,
    is_public: isPublic,
    access_control: isPublic ? undefined : [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDatabases(
  databases: NotionDatabase[],
  context: NotionTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(
    databases.map((database) => transformDatabase(database, context))
  );
}
