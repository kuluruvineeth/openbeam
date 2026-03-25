import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const lucidApp: UnifiedApp = {
  id: AppType.LUCID,
  name: "Lucid",
  category: "Collaboration",
  active: true,
  logo: AppType.LUCID,
  short_description:
    "Search across Lucidchart diagrams, Lucidspark boards, and folders.",
  description:
    "Connect Lucid to search across visual collaboration content including Lucidchart diagrams, Lucidspark whiteboards, folders, and pages. Supports OAuth 2.0 with timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Lucid Software",
  website: "https://lucid.co",

  searchDisplay: {
    defaultIconKey: "FileText",
    documentTypes: {
      document: {
        label: "document",
        iconKey: "FileText",
        category: "document",
      },
      folder: { label: "folder", iconKey: "Folder", category: "folder" },
      page: { label: "page", iconKey: "File", category: "page" },
    },
  },

  features: [
    "Semantic search across Lucidchart diagrams and Lucidspark boards",
    "Incremental sync via updatedAt timestamp filtering",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://lucid.app/oauth2/authorize",
      tokenUrl: "https://api.lucid.co/oauth2/token",
      redirectPath: "/connectors/setup/lucid/oauth/callback",
      scopes: [
        "lucidchart.document.app:read",
        "lucidchart.folder.app:read",
        "account.user:read",
      ],
    },
  },

  streams: [
    {
      name: "documents",
      label: "Documents",
      description: "Lucidchart diagrams and Lucidspark boards",
      entityType: "resource",
      dataPoints: ["Title", "Product", "Creator", "EditedBy", "Status"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Folder hierarchy and organization",
      entityType: "resource",
      dataPoints: ["Name", "Parent", "Type"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "pages",
      label: "Pages",
      description: "Individual pages within documents",
      entityType: "resource",
      dataPoints: ["Title", "Index", "Document"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Lucid OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Lucid developer portal",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Lucid developer portal",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_pages",
      label: "Sync Pages",
      description: "Index individual pages within documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_folders",
      label: "Sync Folders",
      description: "Index folder hierarchy.",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default lucidApp;
