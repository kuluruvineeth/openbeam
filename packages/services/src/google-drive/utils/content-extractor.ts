import {
  type DriveFile,
  GOOGLE_WORKSPACE_MIME_TYPES,
} from "@openplane/types/services/connectors/google-drive";
import { exportFileAsText } from "../api/export";
import type { GoogleDriveClient } from "../client";
import { isTextExtractable } from "./mime-types";

export interface ExtractedContent {
  text?: string;
  error?: string;
}

export async function extractFileContent(
  client: GoogleDriveClient,
  file: DriveFile
): Promise<ExtractedContent> {
  if (!isTextExtractable(file.mimeType)) {
    return {};
  }

  if (file.mimeType.startsWith("application/vnd.google-apps.")) {
    return await extractGoogleWorkspaceContent(client, file);
  }

  if (file.mimeType.startsWith("text/")) {
    return await extractTextFileContent(client, file);
  }

  return {};
}

async function extractGoogleWorkspaceContent(
  client: GoogleDriveClient,
  file: DriveFile
): Promise<ExtractedContent> {
  try {
    const text = await exportFileAsText(client, file.id, file.mimeType);
    return { text: text ?? undefined };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Export failed",
    };
  }
}

async function extractTextFileContent(
  client: GoogleDriveClient,
  file: DriveFile
): Promise<ExtractedContent> {
  const maxSize = 10 * 1024 * 1024;
  const fileSize = file.size ? Number.parseInt(file.size, 10) : 0;

  if (fileSize > maxSize) {
    return { error: "File too large for text extraction" };
  }

  try {
    const buffer = await client.download(file.id);
    const text = new TextDecoder().decode(buffer);
    return { text };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

export function buildFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function buildFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function buildSharedDriveUrl(driveId: string): string {
  return `https://drive.google.com/drive/folders/${driveId}`;
}

export function buildDocumentUrl(fileId: string, mimeType: string): string {
  switch (mimeType) {
    case GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT:
      return `https://docs.google.com/document/d/${fileId}/edit`;

    case GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET:
      return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;

    case GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION:
      return `https://docs.google.com/presentation/d/${fileId}/edit`;

    case GOOGLE_WORKSPACE_MIME_TYPES.FORM:
      return `https://docs.google.com/forms/d/${fileId}/edit`;

    case GOOGLE_WORKSPACE_MIME_TYPES.DRAWING:
      return `https://docs.google.com/drawings/d/${fileId}/edit`;

    case GOOGLE_WORKSPACE_MIME_TYPES.FOLDER:
      return buildFolderUrl(fileId);

    default:
      return buildFileUrl(fileId);
  }
}

export function getOwnerEmail(file: DriveFile): string | undefined {
  const owners = file.owners ?? [];
  return owners[0]?.emailAddress;
}

export function getOwnerName(file: DriveFile): string | undefined {
  const owners = file.owners ?? [];
  return owners[0]?.displayName;
}

export function getLastModifierEmail(file: DriveFile): string | undefined {
  return file.lastModifyingUser?.emailAddress;
}

export function getLastModifierName(file: DriveFile): string | undefined {
  return file.lastModifyingUser?.displayName;
}

export function getCreatedAtMs(file: DriveFile): number {
  if (file.createdTime) {
    return new Date(file.createdTime).getTime();
  }
  return Date.now();
}

export function getModifiedAtMs(file: DriveFile): number {
  if (file.modifiedTime) {
    return new Date(file.modifiedTime).getTime();
  }
  return getCreatedAtMs(file);
}

export function getFileSizeBytes(file: DriveFile): number {
  return file.size ? Number.parseInt(file.size, 10) : 0;
}

export function getAccessControlList(file: DriveFile): string[] {
  const emails: string[] = [];

  for (const owner of file.owners ?? []) {
    if (owner.emailAddress) {
      emails.push(owner.emailAddress);
    }
  }

  for (const permission of file.permissions ?? []) {
    if (permission.emailAddress && !emails.includes(permission.emailAddress)) {
      emails.push(permission.emailAddress);
    }
  }

  return emails;
}

export function isShared(file: DriveFile): boolean {
  return file.shared ?? false;
}

export function isPublic(file: DriveFile): boolean {
  const permissions = file.permissions ?? [];
  return permissions.some((p) => p.type === "anyone");
}

export function getDriveId(file: DriveFile): string | undefined {
  return file.driveId ?? file.teamDriveId;
}

export function getParentId(file: DriveFile): string | undefined {
  const parents = file.parents ?? [];
  return parents[0];
}

const MAX_PATH_DEPTH = 100;

export function buildFilePath(
  file: DriveFile,
  pathMap: Map<string, string>
): string {
  const parts: string[] = [file.name];
  const visited = new Set<string>();
  let currentParent = getParentId(file);
  let depth = 0;

  while (currentParent && depth < MAX_PATH_DEPTH) {
    if (visited.has(currentParent)) {
      break;
    }
    visited.add(currentParent);

    const parentName = pathMap.get(currentParent);
    if (parentName) {
      parts.unshift(parentName);
      currentParent = pathMap.get(`${currentParent}_parent`);
    } else {
      break;
    }
    depth += 1;
  }

  return parts.join("/");
}
