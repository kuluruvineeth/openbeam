import type { DropboxTransformContext } from "@openbeam/types/services/connectors/dropbox";
import type { GenericDocument } from "@openbeam/vespa";
import type { DropboxEntry } from "../client";

const EXTENSION_SUBTYPE_MAP: Record<string, string> = {
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  txt: "document",
  md: "document",
  pdf: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",
  tsv: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  key: "presentation",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  bmp: "image",
  svg: "image",
  webp: "image",
  tiff: "image",
  heic: "image",
};

function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === name.length - 1) {
    return "";
  }
  return name.slice(dotIndex + 1).toLowerCase();
}

function getSubtype(entry: DropboxEntry): string {
  if (entry[".tag"] === "folder") {
    return "folder";
  }
  const ext = getExtension(entry.name);
  return EXTENSION_SUBTYPE_MAP[ext] ?? "file";
}

function buildUrl(entry: DropboxEntry): string {
  const path = entry.path_display ?? entry.path_lower ?? "";
  return `https://www.dropbox.com/home${path}`;
}

function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) {
    return;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1_073_741_824) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export function transformDropboxFile(
  entry: DropboxEntry,
  context: DropboxTransformContext
): GenericDocument {
  const isFolder = entry[".tag"] === "folder";
  const ext = isFolder ? "" : getExtension(entry.name);
  const subtype = getSubtype(entry);
  const path = entry.path_display ?? entry.path_lower ?? "";
  const parentPath = path.slice(0, path.lastIndexOf("/")) || "/";

  const contentParts = [entry.name, path];
  if (ext) {
    contentParts.push(ext);
  }
  const content = contentParts.join(" ");

  const createdAtSource = entry.client_modified ?? entry.server_modified;
  const createdAt = createdAtSource
    ? new Date(createdAtSource).getTime()
    : Date.now();

  const updatedAt = entry.server_modified
    ? new Date(entry.server_modified).getTime()
    : createdAt;

  const isShared =
    entry.sharing_info?.shared_folder_id !== undefined ||
    entry.sharing_info?.parent_shared_folder_id !== undefined;

  return {
    id: `${context.connectorId}_file_${entry.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: entry.id,
    document_type: isFolder ? "folder" : "file",
    document_subtype: subtype,
    title: entry.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildUrl(entry),
    is_public: false,
    access_control: [],
    metadata: {
      ...(entry.path_lower && { path: entry.path_lower }),
      ...(parentPath && { parentPath }),
      ...(ext && { extension: ext }),
      ...(entry.size !== undefined && { size: entry.size }),
      ...(entry.size !== undefined && {
        sizeFormatted: formatSize(entry.size),
      }),
      ...(entry.content_hash && { contentHash: entry.content_hash }),
      ...(isShared && { shared: true }),
    },
  };
}
