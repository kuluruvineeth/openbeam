import type {
  DriveFile,
  GoogleDriveTransformContext,
} from "@openbeam/types/services/connectors/google-drive";
import {
  isFolder,
  isShortcut,
} from "@openbeam/types/services/connectors/google-drive";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import {
  buildDocumentUrl,
  getAccessControlList,
  getCreatedAtMs,
  getDriveId,
  getFileSizeBytes,
  getLastModifierEmail,
  getLastModifierName,
  getModifiedAtMs,
  getOwnerEmail,
  getOwnerName,
  getParentId,
  isPublic,
  isShared,
} from "../utils/content-extractor";
import { getDocumentType } from "../utils/mime-types";

export interface FileTransformOptions {
  content?: string;
  pathMap?: Map<string, string>;
}

function buildParentDocumentId(
  file: DriveFile,
  connectorId: string
): string | undefined {
  const parentId = getParentId(file);
  return parentId ? buildFileDocumentId(connectorId, parentId) : undefined;
}

function buildSourcePath(
  file: DriveFile,
  pathMap?: Map<string, string>
): string | undefined {
  if (!pathMap) {
    return;
  }
  const parentId = getParentId(file);
  if (!parentId) {
    return;
  }
  const parentPath = pathMap.get(parentId);
  return parentPath ? `${parentPath}/${file.name}` : file.name;
}

function buildFileMetadata(file: DriveFile): GenericDocument["metadata"] {
  const lastModifierEmail = getLastModifierEmail(file);
  const lastModifierName = getLastModifierName(file);
  const driveId = getDriveId(file);

  return {
    mimeType: file.mimeType,
    size: getFileSizeBytes(file),
    ...(file.fileExtension && { extension: file.fileExtension }),
    ...(file.md5Checksum && { md5: file.md5Checksum }),
    ...(lastModifierEmail && { lastModifierEmail }),
    ...(lastModifierName && { lastModifierName }),
    ...(file.version && { version: file.version }),
    ...(isShared(file) && { shared: true }),
    ...(driveId && { driveId }),
    ...(file.trashed && { trashed: true }),
    ...(file.starred && { starred: true }),
    ...(file.thumbnailLink && { thumbnailLink: file.thumbnailLink }),
    ...getShortcutMetadata(file),
    ...getMediaMetadata(file),
  };
}

function getShortcutMetadata(file: DriveFile): GenericDocument["metadata"] {
  if (!isShortcut(file.mimeType)) {
    return {};
  }
  if (!file.shortcutDetails) {
    return {};
  }
  return {
    shortcutTargetId: file.shortcutDetails.targetId,
    shortcutTargetMimeType: file.shortcutDetails.targetMimeType,
  };
}

function getMediaMetadata(file: DriveFile): GenericDocument["metadata"] {
  return {
    ...getImageMetadata(file),
    ...getVideoMetadata(file),
  };
}

function getImageMetadata(file: DriveFile): GenericDocument["metadata"] {
  if (!file.imageMediaMetadata) {
    return {};
  }
  const { width, height } = file.imageMediaMetadata;
  return {
    ...(width !== undefined && { imageWidth: width }),
    ...(height !== undefined && { imageHeight: height }),
  };
}

function getVideoMetadata(file: DriveFile): GenericDocument["metadata"] {
  if (!file.videoMediaMetadata) {
    return {};
  }
  const { width, height, durationMillis } = file.videoMediaMetadata;
  return {
    ...(width !== undefined && { videoWidth: width }),
    ...(height !== undefined && { videoHeight: height }),
    ...(durationMillis && {
      videoDuration: Number.parseInt(durationMillis, 10),
    }),
  };
}

function getResourceSourceId(file: DriveFile): string {
  const driveId = getDriveId(file);
  return driveId ?? "my-drive";
}

export async function transformFile(
  file: DriveFile,
  context: GoogleDriveTransformContext,
  options: FileTransformOptions = {}
): Promise<GenericDocument> {
  if (isFolder(file.mimeType)) {
    return transformFolder(file, context);
  }

  const ownerEmail = getOwnerEmail(file);
  const accessControl = getAccessControlList(file);

  const content = options.content ?? file.description ?? "";
  const metadata = buildFileMetadata(file);

  const checksum = await calculateDocumentChecksum({
    title: file.name,
    content,
    metadata,
  });

  return {
    id: buildFileDocumentId(context.connectorId, file.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: file.id,
    document_type: getDocumentType(file.mimeType),
    document_subtype: getDocumentSubtype(file.mimeType),
    mime_type: file.mimeType,
    title: file.name,
    content,
    author_id: ownerEmail,
    author_email: ownerEmail,
    author_name: getOwnerName(file) ?? ownerEmail,
    created_at: getCreatedAtMs(file),
    updated_at: getModifiedAtMs(file),
    source_id: getResourceSourceId(file),
    source_type: "google-drive",
    source_path: buildSourcePath(file, options.pathMap),
    parent_id: buildParentDocumentId(file, context.connectorId),
    file_name: file.name,
    url: file.webViewLink ?? buildDocumentUrl(file.id, file.mimeType),
    is_public: isPublic(file),
    access_control: accessControl,
    contributor_ids: accessControl,
    labels: file.starred ? ["starred"] : undefined,
    metadata,
    checksum,
  };
}

function buildFolderMetadata(file: DriveFile): GenericDocument["metadata"] {
  const driveId = getDriveId(file);
  return {
    mimeType: file.mimeType,
    ...(isShared(file) && { shared: true }),
    ...(driveId && { driveId }),
    ...(file.trashed && { trashed: true }),
    ...(file.starred && { starred: true }),
    ...(file.folderColorRgb && { color: file.folderColorRgb }),
  };
}

async function transformFolder(
  file: DriveFile,
  context: GoogleDriveTransformContext
): Promise<GenericDocument> {
  const ownerEmail = getOwnerEmail(file);
  const accessControl = getAccessControlList(file);

  const content = file.description ?? "";
  const metadata = buildFolderMetadata(file);

  const checksum = await calculateDocumentChecksum({
    title: file.name,
    content,
    metadata,
  });

  return {
    id: buildFileDocumentId(context.connectorId, file.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: file.id,
    document_type: "folder",
    mime_type: file.mimeType,
    title: file.name,
    content,
    author_id: ownerEmail,
    author_email: ownerEmail,
    author_name: getOwnerName(file) ?? ownerEmail,
    created_at: getCreatedAtMs(file),
    updated_at: getModifiedAtMs(file),
    source_id: getResourceSourceId(file),
    source_type: "google-drive",
    parent_id: buildParentDocumentId(file, context.connectorId),
    file_name: file.name,
    url:
      file.webViewLink ?? `https://drive.google.com/drive/folders/${file.id}`,
    is_public: isPublic(file),
    access_control: accessControl,
    contributor_ids: accessControl,
    labels: file.starred ? ["starred"] : undefined,
    metadata,
    checksum,
  };
}

function buildFileDocumentId(connectorId: string, fileId: string): string {
  return `${connectorId}_file_${fileId}`;
}

function getDocumentSubtype(mimeType: string): string | undefined {
  if (mimeType.startsWith("application/vnd.google-apps.")) {
    const parts = mimeType.split(".");
    return parts.at(-1);
  }

  if (mimeType.includes("/")) {
    const [, subtype] = mimeType.split("/");
    if (subtype && !subtype.includes(".")) {
      return subtype;
    }
  }

  return;
}

export function transformFiles(
  files: DriveFile[],
  context: GoogleDriveTransformContext,
  options: FileTransformOptions = {}
): Promise<GenericDocument[]> {
  return Promise.all(
    files.map((file) => transformFile(file, context, options))
  );
}
