"use client";

const FILE_ID_REGEX = /\/d\/([a-zA-Z0-9_-]+)/;

function extractFileId(url: string): string | null {
  const match = url.match(FILE_ID_REGEX);
  return match?.[1] ?? null;
}

function getPreviewPath(mimeType?: string): string {
  if (!mimeType?.includes("google-apps")) {
    return "drive.google.com/file";
  }
  if (mimeType.includes("document")) {
    return "docs.google.com/document";
  }
  if (mimeType.includes("spreadsheet")) {
    return "docs.google.com/spreadsheets";
  }
  if (mimeType.includes("presentation")) {
    return "docs.google.com/presentation";
  }
  return "drive.google.com/file";
}

function getGoogleEmbedUrl(url: string, mimeType?: string): string {
  const fileId = extractFileId(url);
  if (!fileId) {
    return url;
  }
  const path = getPreviewPath(mimeType);
  return `https://${path}/d/${fileId}/preview`;
}

type IframeViewerProps = {
  url: string;
  fileName: string;
  mimeType?: string;
};

export function IframeViewer({ url, fileName, mimeType }: IframeViewerProps) {
  const embedUrl = getGoogleEmbedUrl(url, mimeType);

  return (
    <iframe
      allow="autoplay"
      className="size-full border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      src={embedUrl}
      title={fileName}
    />
  );
}
