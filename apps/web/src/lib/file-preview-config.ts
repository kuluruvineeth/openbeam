import type { ComponentType } from "react";

export type ViewerProps = {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  pageCount?: number | null;
};

export type ViewerComponent = ComponentType<ViewerProps>;

export type FileCategory =
  | "pdf"
  | "image"
  | "text"
  | "code"
  | "audio"
  | "video"
  | "docx"
  | "spreadsheet"
  | "presentation"
  | "document"
  | "unsupported";

export function getFileCategory(mimeType: string): FileCategory {
  const type = mimeType.toLowerCase();

  if (type === "application/pdf") {
    return "pdf";
  }

  if (type.startsWith("image/")) {
    return "image";
  }

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "application/msword"
  ) {
    return "docx";
  }

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.ms-excel" ||
    type === "text/csv"
  ) {
    return "spreadsheet";
  }

  if (
    type === "text/plain" ||
    type === "text/markdown" ||
    type === "text/html"
  ) {
    return "text";
  }

  if (
    type === "application/json" ||
    type === "application/xml" ||
    type === "text/xml" ||
    type === "application/javascript" ||
    type === "text/javascript" ||
    type === "text/css"
  ) {
    return "code";
  }

  if (type.startsWith("audio/")) {
    return "audio";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    type === "application/vnd.ms-powerpoint"
  ) {
    return "presentation";
  }

  return "unsupported";
}

export function isPreviewableByMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  const category = getFileCategory(mimeType);
  return (
    category === "pdf" ||
    category === "image" ||
    category === "text" ||
    category === "code" ||
    category === "docx" ||
    category === "spreadsheet" ||
    category === "presentation"
  );
}

export function isPreviewable(
  mimeType: string | undefined,
  fileName?: string,
  documentType?: string
): boolean {
  if (mimeType && isPreviewableByMimeType(mimeType)) {
    return true;
  }

  if (fileName && isPreviewableByExtension(fileName)) {
    return true;
  }

  if (documentType === "file" || documentType === "attachment") {
    return true;
  }

  return false;
}

export function getFileTypeLabel(mimeType: string): string {
  const category = getFileCategory(mimeType);

  switch (category) {
    case "pdf":
      return "PDF Document";
    case "image":
      return "Image";
    case "text":
      return "Text File";
    case "code":
      return "Code File";
    case "audio":
      return "Audio File";
    case "video":
      return "Video File";
    case "docx":
      return "Word Document";
    case "spreadsheet":
      return "Spreadsheet";
    case "presentation":
      return "Presentation";
    case "document":
      return "Document";
    default:
      return "File";
  }
}

export const PREVIEWABLE_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "txt",
  "md",
  "markdown",
  "csv",
  "log",
  "json",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "jsx",
  "tsx",
  "yaml",
  "yml",
  "docx",
  "doc",
  "xlsx",
  "xls",
  "pptx",
  "ppt",
]);

export function isPreviewableByExtension(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? PREVIEWABLE_EXTENSIONS.has(ext) : false;
}

export type PreviewCategory = "document" | "media" | "email" | "slack";

export function getPreviewCategory(
  connectorType: string,
  documentType: string
): PreviewCategory | null {
  const connector = connectorType.toLowerCase();
  const docType = documentType.toLowerCase();

  if (
    connector === "gmail" &&
    (docType.includes("message") ||
      docType.includes("thread") ||
      docType.includes("email"))
  ) {
    return "email";
  }

  if (
    connector === "slack" &&
    (docType.includes("message") || docType.includes("thread"))
  ) {
    return "slack";
  }

  if (docType.includes("file") || docType.includes("attachment")) {
    return "document";
  }

  return null;
}

export function isMessagePreviewable(
  connectorType: string,
  documentType: string
): boolean {
  const category = getPreviewCategory(connectorType, documentType);
  return category === "email" || category === "slack";
}
