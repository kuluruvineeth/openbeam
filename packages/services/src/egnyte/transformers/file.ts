import type { EgnyteTransformContext } from "@openbeam/types/services/connectors/egnyte";
import type { GenericDocument } from "@openbeam/vespa";
import type { EgnyteFileEntry } from "../client";
import {
  buildEgnyteUrl,
  formatSize,
  getExtension,
  getSubtypeFromExtension,
} from "./utils";

function getDocumentType(entry: EgnyteFileEntry): string {
  return entry.is_folder ? "folder" : "file";
}

function getSubtype(entry: EgnyteFileEntry): string {
  if (entry.is_folder) {
    return "folder";
  }
  const ext = getExtension(entry.name);
  return getSubtypeFromExtension(ext);
}

function buildParentPath(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) {
    return "/";
  }
  return path.slice(0, lastSlash);
}

export function transformEgnyteFile(
  entry: EgnyteFileEntry,
  context: EgnyteTransformContext
): GenericDocument {
  const ext = entry.is_folder ? "" : getExtension(entry.name);
  const parentPath = buildParentPath(entry.path);

  const contentParts = [entry.name, entry.path];
  if (ext) {
    contentParts.push(ext);
  }
  const content = contentParts.join(" ");

  const entryId = entry.entry_id ?? entry.folder_id ?? entry.path;

  const createdAt = entry.created
    ? new Date(entry.created).getTime()
    : Date.now();

  const updatedAt = entry.last_modified
    ? new Date(entry.last_modified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_${entry.is_folder ? "folder" : "file"}_${entryId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: entryId,
    document_type: getDocumentType(entry),
    document_subtype: getSubtype(entry),
    title: entry.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildEgnyteUrl(context.domain, entry.path),
    author_name: entry.uploaded_by,
    is_public: false,
    access_control: [],
    metadata: {
      ...(entry.path && { path: entry.path }),
      ...(parentPath && { parentPath }),
      ...(ext && { extension: ext }),
      ...(entry.size !== undefined && { size: entry.size }),
      ...(entry.size !== undefined && {
        sizeFormatted: formatSize(entry.size),
      }),
      ...(entry.checksum && { checksum: entry.checksum }),
      ...(entry.locked && { locked: true }),
      ...(entry.num_files !== undefined && { fileCount: entry.num_files }),
      ...(entry.num_folders !== undefined && {
        folderCount: entry.num_folders,
      }),
    },
  };
}
