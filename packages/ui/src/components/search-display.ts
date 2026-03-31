import { appStore, type UnifiedApp } from "@openbeam/integrations";
import { Icons } from "./icons";

type IconComponent = (typeof Icons)[keyof typeof Icons];

const FALLBACK_ICONS: Record<string, keyof typeof Icons> = {
  message: "Message",
  email: "Mail",
  file: "FileIcon",
  document: "FileTextIcon",
  folder: "Folder",
  spreadsheet: "FileSpreadsheetIcon",
  presentation: "PresentationIcon",
  image: "FileImageIcon",
  pdf: "FilePdf",
  audio: "FileAudio",
  video: "FileVideo",
  code: "FileCode",
  archive: "FileArchive",
  attachment: "Attachment",
  issue: "AlertCircle",
  ticket: "AlertCircle",
  pull_request: "GitBranch",
  pr: "GitBranch",
  task: "Task",
  event: "Calendar",
  meeting: "Calendar",
  page: "FileTextIcon",
  comment: "Comment",
  channel: "Hash",
};

const MIME_ICON_MAP: Array<{
  match: (type: string) => boolean;
  icon: keyof typeof Icons;
}> = [
  { match: (t) => t === "application/pdf", icon: "FilePdf" },
  { match: (t) => t.startsWith("image/"), icon: "FileImageIcon" },
  { match: (t) => t.startsWith("video/"), icon: "FileVideo" },
  { match: (t) => t.startsWith("audio/"), icon: "FileAudio" },
  {
    match: (t) =>
      t.includes("spreadsheet") || t.includes("excel") || t === "text/csv",
    icon: "FileSpreadsheetIcon",
  },
  {
    match: (t) => t.includes("presentation") || t.includes("powerpoint"),
    icon: "PresentationIcon",
  },
  {
    match: (t) =>
      t.includes("zip") ||
      t.includes("tar") ||
      t.includes("rar") ||
      t.includes("7z"),
    icon: "FileArchive",
  },
  {
    match: (t) =>
      t.includes("javascript") ||
      t.includes("typescript") ||
      t.includes("python") ||
      t.includes("json") ||
      t.includes("xml"),
    icon: "FileCode",
  },
  {
    match: (t) =>
      t.startsWith("text/") || t.includes("document") || t.includes("word"),
    icon: "FileTextIcon",
  },
];

export function getConnectorApp(connectorType: string): UnifiedApp | undefined {
  return appStore.find(
    (app) => app.id.toLowerCase() === connectorType.toLowerCase()
  );
}

function getIconFromMimeType(mimeType: string): IconComponent | null {
  const type = mimeType.toLowerCase();
  const entry = MIME_ICON_MAP.find((e) => e.match(type));
  return entry ? Icons[entry.icon] : null;
}

function getAppIcon(
  app: UnifiedApp,
  mimeType: string | undefined,
  docType: string
): IconComponent | null {
  const { documentTypes, mimeTypes, defaultIconKey } = app.searchDisplay ?? {};

  if (mimeType && mimeTypes) {
    for (const [pattern, config] of Object.entries(mimeTypes)) {
      if (mimeType.includes(pattern) || mimeType.startsWith(pattern)) {
        const icon = Icons[config.iconKey as keyof typeof Icons];
        if (icon) {
          return icon;
        }
      }
    }
  }

  if (documentTypes?.[docType]) {
    const icon = Icons[documentTypes[docType].iconKey as keyof typeof Icons];
    if (icon) {
      return icon;
    }
  }

  if (defaultIconKey) {
    const icon = Icons[defaultIconKey as keyof typeof Icons];
    if (icon) {
      return icon;
    }
  }

  return null;
}

export function getDocumentIcon(
  connectorType: string,
  documentType: string,
  mimeType?: string
): IconComponent {
  const mimeIcon = mimeType ? getIconFromMimeType(mimeType) : null;
  if (mimeIcon) {
    return mimeIcon;
  }

  const app = getConnectorApp(connectorType);
  const docType = documentType.toLowerCase();
  const appIcon = app?.searchDisplay
    ? getAppIcon(app, mimeType, docType)
    : null;
  if (appIcon) {
    return appIcon;
  }

  const fallbackKey = FALLBACK_ICONS[docType];
  return (fallbackKey ? Icons[fallbackKey] : undefined) ?? Icons.FileIcon;
}

export function getDocumentTypeLabel(
  connectorType: string,
  documentType: string,
  mimeType?: string
): string {
  const app = getConnectorApp(connectorType);
  const docType = documentType.toLowerCase();

  if (app?.searchDisplay) {
    const { documentTypes, mimeTypes } = app.searchDisplay;

    if (mimeType && mimeTypes) {
      for (const [pattern, config] of Object.entries(mimeTypes)) {
        if (mimeType.includes(pattern) || mimeType.startsWith(pattern)) {
          return config.label;
        }
      }
    }

    if (documentTypes[docType]) {
      return documentTypes[docType].label;
    }
  }

  return docType.replace(/_/g, " ");
}

export function formatSourceName(
  connectorType: string,
  sourceName: string,
  sourceType?: string
): string {
  const app = getConnectorApp(connectorType);
  if (app?.searchDisplay?.formatSourceName) {
    return app.searchDisplay.formatSourceName(sourceName, sourceType);
  }
  return sourceName;
}

export function isContentPrimary(
  connectorType: string,
  documentType: string
): boolean {
  const app = getConnectorApp(connectorType);
  const docType = documentType.toLowerCase();
  return app?.searchDisplay?.contentPrimaryDocTypes?.includes(docType) ?? false;
}
