import type { GuruTransformContext } from "@openbeam/types/services/connectors/guru";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface GuruFolder {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  folderCount?: number;
  cardCount?: number;
  dateCreated?: string;
  lastModified?: string;
  collection?: {
    id: string;
    name: string;
  };
}

function buildFolderContent(folder: GuruFolder): string {
  const parts: string[] = [];

  if (folder.description) {
    parts.push(folder.description);
  }

  if (folder.collection) {
    parts.push(`Collection: ${folder.collection.name}`);
  }

  if (typeof folder.cardCount === "number") {
    parts.push(`Cards: ${folder.cardCount}`);
  }

  if (typeof folder.folderCount === "number") {
    parts.push(`Subfolders: ${folder.folderCount}`);
  }

  return parts.join("\n");
}

export async function transformFolder(
  folder: GuruFolder,
  context: GuruTransformContext
): Promise<GenericDocument> {
  const title = folder.title;
  const content = buildFolderContent(folder);
  const metadata: GenericDocument["metadata"] = {
    folderId: folder.id,
    ...(folder.collection && {
      collectionId: folder.collection.id,
      collectionName: folder.collection.name,
    }),
    ...(typeof folder.cardCount === "number" && {
      cardCount: folder.cardCount,
    }),
    ...(typeof folder.folderCount === "number" && {
      folderCount: folder.folderCount,
    }),
    ...(folder.slug && { slug: folder.slug }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = folder.dateCreated
    ? new Date(folder.dateCreated).getTime()
    : Date.now();
  const updatedAt = folder.lastModified
    ? new Date(folder.lastModified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_folder_${folder.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.id,
    document_type: "folder",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "guru",
    url: `https://app.getguru.com/folders/${folder.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
