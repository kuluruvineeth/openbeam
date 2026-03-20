import type { SharePointTransformContext } from "@openbeam/types/services/connectors/sharepoint";
import type { GenericDocument } from "@openbeam/vespa";

type SharePointDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  file?: { mimeType: string };
  createdDateTime: string;
  lastModifiedDateTime: string;
  createdBy?: { user?: { displayName?: string; email?: string } };
  lastModifiedBy?: { user?: { displayName?: string; email?: string } };
  parentReference?: {
    id?: string;
    path?: string;
    driveId?: string;
    siteId?: string;
  };
};

const PARENT_PATH_PREFIX = /.*root:/;

function extractFileExtension(fileName: string): string | undefined {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1 || lastDot === fileName.length - 1) {
    return;
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}

const SUBTYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "pdf",
  doc: "document",
  docx: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  txt: "text",
  md: "markdown",
  csv: "spreadsheet",
  json: "data",
  xml: "data",
  html: "webpage",
  htm: "webpage",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  mp4: "video",
  mov: "video",
  mp3: "audio",
  wav: "audio",
  zip: "archive",
  rar: "archive",
};

function deriveDocumentSubtype(
  mimeType: string | undefined,
  extension: string | undefined
): string | undefined {
  if (extension) {
    const mapped = SUBTYPE_BY_EXTENSION[extension];
    if (mapped) {
      return mapped;
    }
  }
  if (mimeType) {
    if (mimeType.startsWith("image/")) {
      return "image";
    }
    if (mimeType.startsWith("video/")) {
      return "video";
    }
    if (mimeType.startsWith("audio/")) {
      return "audio";
    }
    if (mimeType.includes("pdf")) {
      return "pdf";
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return "spreadsheet";
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return "presentation";
    }
    if (mimeType.includes("document") || mimeType.includes("word")) {
      return "document";
    }
  }
  return;
}

export function transformDriveItem(
  item: SharePointDriveItem,
  context: SharePointTransformContext,
  options: { siteName?: string; driveName?: string } = {}
): GenericDocument {
  const createdAt = new Date(item.createdDateTime).getTime();
  const updatedAt = new Date(item.lastModifiedDateTime).getTime();
  const authorEmail =
    item.lastModifiedBy?.user?.email ?? item.createdBy?.user?.email;
  const authorName =
    item.lastModifiedBy?.user?.displayName ?? item.createdBy?.user?.displayName;
  const parentPath =
    item.parentReference?.path?.replace(PARENT_PATH_PREFIX, "") ?? "";
  const extension = extractFileExtension(item.name);
  const subtype = deriveDocumentSubtype(item.file?.mimeType, extension);

  return {
    id: `${context.connectorId}_file_${item.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: item.id,
    document_type: "file",
    document_subtype: subtype,
    source_type: "sharepoint",
    parent_id: item.parentReference?.id,
    title: item.name,
    content: "",
    author_id: authorEmail,
    author_email: authorEmail,
    author_name: authorName ?? authorEmail,
    created_at: createdAt,
    updated_at: updatedAt,
    url: item.webUrl,
    is_public: false,
    file_name: item.name,
    file_extension: extension,
    file_size: item.size,
    mime_type: item.file?.mimeType,
    source_path: parentPath || undefined,
    source_name: options.siteName,
    metadata: {
      mimeType: item.file?.mimeType ?? "unknown",
      size: item.size ?? 0,
      parentPath,
      siteName: options.siteName ?? "",
      driveName: options.driveName ?? "",
      driveId: item.parentReference?.driveId ?? "",
      siteId: item.parentReference?.siteId ?? "",
    },
  };
}
