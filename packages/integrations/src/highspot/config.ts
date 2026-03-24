import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const highspotApp: UnifiedApp = {
  id: AppType.HIGHSPOT,
  name: "Highspot",
  category: "Sales Enablement",
  active: true,
  logo: AppType.HIGHSPOT,
  short_description: "Search across sales content, spots, and pitches.",
  description:
    "Connect Highspot to search across sales enablement content including items (documents, presentations, videos), spots (content collections), and pitches (buyer-facing content shares). Supports OAuth 2.0 with timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Highspot, Inc.",
  website: "https://www.highspot.com",

  searchDisplay: {
    defaultIconKey: "FilePresentation",
    documentTypes: {
      document: {
        label: "document",
        iconKey: "FileText",
        category: "document",
      },
      presentation: {
        label: "presentation",
        iconKey: "FilePresentation",
        category: "document",
      },
      video: { label: "video", iconKey: "Video", category: "document" },
      folder: { label: "spot", iconKey: "Folder", category: "folder" },
      pitch: { label: "pitch", iconKey: "Send", category: "document" },
    },
  },

  features: [
    "Semantic search across items, spots, and pitches",
    "Incremental sync via updated_after timestamp filtering",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://app.highspot.com/oauth2/authorize",
      tokenUrl: "https://app.highspot.com/oauth2/token",
      redirectPath: "/connectors/setup/highspot/oauth/callback",
      scopes: ["items:read", "spots:read", "pitches:read"],
    },
  },

  streams: [
    {
      name: "items",
      label: "Items",
      description: "Content pieces (documents, presentations, videos)",
      entityType: "resource",
      dataPoints: ["Title", "Type", "Author", "Tags", "Spot", "Last Modified"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "spots",
      label: "Spots",
      description: "Content collections and groups",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Owner", "Item Count"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "pitches",
      label: "Pitches",
      description: "Buyer-facing content shares",
      entityType: "activity",
      dataPoints: ["Title", "Sender", "Recipients", "Items", "Status"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Highspot OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Highspot developer portal",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Highspot developer portal",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_pitches",
      label: "Sync Pitches",
      description: "Index buyer-facing pitches as searchable documents.",
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

export default highspotApp;
