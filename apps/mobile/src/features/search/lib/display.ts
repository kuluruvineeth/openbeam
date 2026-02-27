import type { LucideIcon } from "lucide-react-native";
import {
  AlertCircle,
  Calendar,
  File,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  GitBranch,
  Hash,
  Mail,
  MessageSquare,
  Paperclip,
  Presentation,
  Table,
} from "lucide-react-native";

const DOCUMENT_TYPE_ICONS: Record<string, LucideIcon> = {
  message: MessageSquare,
  email: Mail,
  file: File,
  document: FileText,
  folder: Folder,
  spreadsheet: Table,
  presentation: Presentation,
  image: FileImage,
  pdf: FileText,
  audio: FileAudio,
  video: FileVideo,
  code: FileCode,
  archive: File,
  attachment: Paperclip,
  issue: AlertCircle,
  ticket: AlertCircle,
  pull_request: GitBranch,
  pr: GitBranch,
  task: AlertCircle,
  event: Calendar,
  meeting: Calendar,
  page: FileText,
  comment: MessageSquare,
  channel: Hash,
};

const MIME_TYPE_ICONS: Array<{
  match: (type: string) => boolean;
  icon: LucideIcon;
}> = [
  { match: (t) => t === "application/pdf", icon: FileText },
  { match: (t) => t.startsWith("image/"), icon: FileImage },
  { match: (t) => t.startsWith("video/"), icon: FileVideo },
  { match: (t) => t.startsWith("audio/"), icon: FileAudio },
  {
    match: (t) =>
      t.includes("spreadsheet") || t.includes("excel") || t === "text/csv",
    icon: Table,
  },
  {
    match: (t) => t.includes("presentation") || t.includes("powerpoint"),
    icon: Presentation,
  },
  {
    match: (t) =>
      t.includes("javascript") ||
      t.includes("typescript") ||
      t.includes("python") ||
      t.includes("json") ||
      t.includes("xml"),
    icon: FileCode,
  },
  {
    match: (t) =>
      t.startsWith("text/") || t.includes("document") || t.includes("word"),
    icon: FileText,
  },
];

export function getDocumentIcon(
  _connectorType: string,
  documentType: string,
  mimeType?: string
): LucideIcon {
  if (mimeType) {
    const lower = mimeType.toLowerCase();
    const mimeEntry = MIME_TYPE_ICONS.find((e) => e.match(lower));
    if (mimeEntry) {
      return mimeEntry.icon;
    }
  }

  const docType = documentType.toLowerCase();
  return DOCUMENT_TYPE_ICONS[docType] ?? File;
}

export function getDocumentTypeLabel(
  _connectorType: string,
  documentType: string,
  _mimeType?: string
): string {
  return documentType.toLowerCase().replace(/_/g, " ");
}

const CONNECTOR_LABELS: Record<string, string> = {
  slack: "Slack",
  gmail: "Gmail",
  "google-drive": "Google Drive",
  google_drive: "Google Drive",
  notion: "Notion",
  linear: "Linear",
  jira: "Jira",
  confluence: "Confluence",
  github: "GitHub",
  asana: "Asana",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  sharepoint: "SharePoint",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  intercom: "Intercom",
  zendesk: "Zendesk",
  figma: "Figma",
  "google-calendar": "Google Calendar",
  google_calendar: "Google Calendar",
  outlook: "Outlook",
  teams: "Microsoft Teams",
};

export function getConnectorLabel(connectorType: string): string {
  const lower = connectorType.toLowerCase();
  return (
    CONNECTOR_LABELS[lower] ??
    connectorType.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function formatSourceName(
  _connectorType: string,
  sourceName: string,
  _sourceType?: string
): string {
  return sourceName;
}

export function isContentPrimary(
  _connectorType: string,
  documentType: string
): boolean {
  const contentFirst = new Set(["message", "email", "comment"]);
  return contentFirst.has(documentType.toLowerCase());
}
