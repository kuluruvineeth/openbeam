import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const seismicApp: UnifiedApp = {
  id: AppType.SEISMIC,
  name: "Seismic",
  category: "Sales Enablement",
  active: true,
  logo: AppType.SEISMIC,
  short_description: "Search across sales content, workspaces, and LiveDocs.",
  description:
    "Connect Seismic to search across sales enablement content including documents, presentations, workspaces, and LiveDocs. Supports OAuth 2.0 with timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Seismic Software, Inc.",
  website: "https://seismic.com",

  searchDisplay: {
    defaultIconKey: "FileText",
    documentTypes: {
      content: { label: "content", iconKey: "FileText", category: "document" },
      workspace: {
        label: "workspace",
        iconKey: "Folder",
        category: "folder",
      },
      livedoc: {
        label: "livedoc",
        iconKey: "FileCode",
        category: "document",
      },
    },
  },

  features: [
    "Semantic search across sales content, workspaces, and LiveDocs",
    "Incremental sync via modifiedSince timestamp filtering",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://auth.seismic.com/central/connect/authorize",
      tokenUrl: "https://auth.seismic.com/central/connect/token",
      redirectPath: "/connectors/setup/seismic/oauth/callback",
      scopes: ["seismic.library.view", "seismic.library.manage"],
    },
  },

  streams: [
    {
      name: "contents",
      label: "Contents",
      description: "Sales documents, presentations, and media assets",
      entityType: "resource",
      dataPoints: ["Name", "Type", "Version", "Author", "Workspace", "Tags"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "workspaces",
      label: "Workspaces",
      description: "Content organization workspaces (teamsites)",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Owner"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "livedocs",
      label: "LiveDocs",
      description: "Dynamic content templates with merge fields",
      entityType: "resource",
      dataPoints: ["Name", "Template", "Author", "LastModified"],
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
      description: "Enter Seismic OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Seismic developer portal",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Seismic developer portal",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_livedocs",
      label: "Sync LiveDocs",
      description: "Index LiveDoc templates as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
  ],
};

export default seismicApp;
