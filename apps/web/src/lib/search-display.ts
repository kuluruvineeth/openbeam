import { appStore, type UnifiedApp } from "@openplane/integrations";
import { Icons } from "@/components/icons";

type IconComponent = (typeof Icons)[keyof typeof Icons];

const FALLBACK_ICONS: Record<string, keyof typeof Icons> = {
  message: "Message",
  email: "Mail",
  file: "FileTextIcon",
  document: "FileTextIcon",
  folder: "Folder",
  spreadsheet: "FileSpreadsheetIcon",
  presentation: "PresentationIcon",
  image: "FileImageIcon",
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

export function getConnectorApp(connectorType: string): UnifiedApp | undefined {
  return appStore.find(
    (app) => app.id.toLowerCase() === connectorType.toLowerCase()
  );
}

export function getDocumentIcon(
  connectorType: string,
  documentType: string,
  mimeType?: string
): IconComponent {
  const app = getConnectorApp(connectorType);
  const docType = documentType.toLowerCase();

  if (app?.searchDisplay) {
    const { documentTypes, mimeTypes, defaultIconKey } = app.searchDisplay;

    if (mimeType && mimeTypes) {
      for (const [pattern, config] of Object.entries(mimeTypes)) {
        if (mimeType.includes(pattern) || mimeType.startsWith(pattern)) {
          const icon = Icons[config.iconKey as keyof typeof Icons];
          if (icon) return icon;
        }
      }
    }

    if (documentTypes[docType]) {
      const icon = Icons[documentTypes[docType].iconKey as keyof typeof Icons];
      if (icon) return icon;
    }

    const defaultIcon = Icons[defaultIconKey as keyof typeof Icons];
    if (defaultIcon) return defaultIcon;
  }

  const fallbackKey = FALLBACK_ICONS[docType];
  if (fallbackKey) {
    return Icons[fallbackKey];
  }

  return Icons.FileIcon;
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
