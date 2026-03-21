import type { BoxTransformContext } from "@openbeam/types/services/connectors/box";
import type { GenericDocument } from "@openbeam/vespa";
import type { BoxItem } from "../client";

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

function getDocumentType(item: BoxItem): string {
  if (item.type === "folder") {
    return "folder";
  }
  if (item.type === "web_link") {
    return "web_link";
  }
  return "file";
}

function getSubtype(item: BoxItem): string {
  if (item.type === "folder") {
    return "folder";
  }
  if (item.type === "web_link") {
    return "web_link";
  }
  const ext = getExtension(item.name);
  return EXTENSION_SUBTYPE_MAP[ext] ?? "file";
}

function buildPath(item: BoxItem): string {
  if (!item.path_collection?.entries) {
    return "/";
  }
  return `${item.path_collection.entries.map((e) => e.name).join("/")}/${item.name}`;
}

function buildUrl(item: BoxItem): string {
  if (item.type === "web_link" && item.url) {
    return item.url;
  }
  if (item.type === "folder") {
    return `https://app.box.com/folder/${item.id}`;
  }
  return `https://app.box.com/file/${item.id}`;
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

export function transformBoxItem(
  item: BoxItem,
  context: BoxTransformContext
): GenericDocument {
  const ext = item.type === "file" ? getExtension(item.name) : "";
  const path = buildPath(item);
  const parentPath = path.slice(0, path.lastIndexOf("/")) || "/";

  const contentParts = [item.name, path];
  if (item.description) {
    contentParts.push(item.description);
  }
  if (ext) {
    contentParts.push(ext);
  }
  const content = contentParts.join(" ");

  const createdAt = item.created_at
    ? new Date(item.created_at).getTime()
    : Date.now();

  const updatedAtSource = item.content_modified_at ?? item.modified_at;
  const updatedAt = updatedAtSource
    ? new Date(updatedAtSource).getTime()
    : createdAt;

  const hasSharedLink = item.shared_link?.url !== undefined;

  return {
    id: `${context.connectorId}_${item.type}_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: getDocumentType(item),
    document_subtype: getSubtype(item),
    title: item.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildUrl(item),
    author: item.owned_by?.name,
    is_public: hasSharedLink,
    access_control: [],
    metadata: {
      ...(path && { path }),
      ...(parentPath && { parentPath }),
      ...(ext && { extension: ext }),
      ...(item.size !== undefined && { size: item.size }),
      ...(item.size !== undefined && {
        sizeFormatted: formatSize(item.size),
      }),
      ...(item.sha1 && { sha1: item.sha1 }),
      ...(hasSharedLink && { shared: true }),
      ...(item.owned_by?.login && { ownerEmail: item.owned_by.login }),
      ...(item.type === "web_link" && item.url && { targetUrl: item.url }),
    },
  };
}
