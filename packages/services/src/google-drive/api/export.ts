import {
  GOOGLE_WORKSPACE_MIME_TYPES,
  isGoogleWorkspaceType,
} from "@openbeam/types/services/connectors/google-drive";
import type { GoogleDriveClient } from "../client";

export const EXPORT_MIME_TYPES = {
  TEXT_PLAIN: "text/plain",
  TEXT_CSV: "text/csv",
  TEXT_TSV: "text/tab-separated-values",
  TEXT_HTML: "text/html",
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  RTF: "application/rtf",
  ODT: "application/vnd.oasis.opendocument.text",
  ODS: "application/vnd.oasis.opendocument.spreadsheet",
  ODP: "application/vnd.oasis.opendocument.presentation",
  EPUB: "application/epub+zip",
  ZIP: "application/zip",
  JPEG: "image/jpeg",
  PNG: "image/png",
  SVG: "image/svg+xml",
} as const;

const DEFAULT_EXPORT_FORMATS: Record<string, string> = {
  [GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT]: EXPORT_MIME_TYPES.TEXT_PLAIN,
  [GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET]: EXPORT_MIME_TYPES.TEXT_CSV,
  [GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION]: EXPORT_MIME_TYPES.TEXT_PLAIN,
  [GOOGLE_WORKSPACE_MIME_TYPES.DRAWING]: EXPORT_MIME_TYPES.SVG,
  [GOOGLE_WORKSPACE_MIME_TYPES.FORM]: EXPORT_MIME_TYPES.TEXT_PLAIN,
};

export async function exportFileAsText(
  client: GoogleDriveClient,
  fileId: string,
  mimeType: string
): Promise<string | null> {
  if (!isGoogleWorkspaceType(mimeType)) {
    return null;
  }

  const exportMimeType = DEFAULT_EXPORT_FORMATS[mimeType];
  if (!exportMimeType) {
    return null;
  }

  return await client.export(fileId, exportMimeType);
}

export async function exportDocument(
  client: GoogleDriveClient,
  fileId: string,
  exportMimeType = EXPORT_MIME_TYPES.TEXT_PLAIN
): Promise<string> {
  return await client.export(fileId, exportMimeType);
}

export async function exportSpreadsheet(
  client: GoogleDriveClient,
  fileId: string,
  exportMimeType = EXPORT_MIME_TYPES.TEXT_CSV
): Promise<string> {
  return await client.export(fileId, exportMimeType);
}

export async function exportPresentation(
  client: GoogleDriveClient,
  fileId: string,
  exportMimeType = EXPORT_MIME_TYPES.TEXT_PLAIN
): Promise<string> {
  return await client.export(fileId, exportMimeType);
}

export async function exportDrawing(
  client: GoogleDriveClient,
  fileId: string,
  exportMimeType = EXPORT_MIME_TYPES.SVG
): Promise<string> {
  return await client.export(fileId, exportMimeType);
}

export function getDefaultExportMimeType(
  googleMimeType: string
): string | null {
  return DEFAULT_EXPORT_FORMATS[googleMimeType] ?? null;
}

export function canExport(mimeType: string): boolean {
  return mimeType in DEFAULT_EXPORT_FORMATS;
}

export function getExportOptions(mimeType: string): string[] {
  switch (mimeType) {
    case GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT:
      return [
        EXPORT_MIME_TYPES.TEXT_PLAIN,
        EXPORT_MIME_TYPES.TEXT_HTML,
        EXPORT_MIME_TYPES.PDF,
        EXPORT_MIME_TYPES.DOCX,
        EXPORT_MIME_TYPES.RTF,
        EXPORT_MIME_TYPES.ODT,
        EXPORT_MIME_TYPES.EPUB,
      ];

    case GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET:
      return [
        EXPORT_MIME_TYPES.TEXT_CSV,
        EXPORT_MIME_TYPES.TEXT_TSV,
        EXPORT_MIME_TYPES.PDF,
        EXPORT_MIME_TYPES.XLSX,
        EXPORT_MIME_TYPES.ODS,
        EXPORT_MIME_TYPES.ZIP,
      ];

    case GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION:
      return [
        EXPORT_MIME_TYPES.TEXT_PLAIN,
        EXPORT_MIME_TYPES.PDF,
        EXPORT_MIME_TYPES.PPTX,
        EXPORT_MIME_TYPES.ODP,
      ];

    case GOOGLE_WORKSPACE_MIME_TYPES.DRAWING:
      return [
        EXPORT_MIME_TYPES.SVG,
        EXPORT_MIME_TYPES.PNG,
        EXPORT_MIME_TYPES.JPEG,
        EXPORT_MIME_TYPES.PDF,
      ];

    default:
      return [];
  }
}
