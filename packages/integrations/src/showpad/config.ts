import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const showpadApp: UnifiedApp = {
  id: AppType.SHOWPAD,
  name: "Showpad",
  category: "Sales Enablement",
  active: true,
  logo: AppType.SHOWPAD,
  short_description:
    "Search across sales content, channels, and shared experiences in Showpad.",
  description:
    "Connect Showpad to search across sales enablement content including assets, channels, shared experiences, and tags. Supports OAuth 2.0 with subdomain-specific URLs and updatedSince-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Showpad NV",
  website: "https://www.showpad.com",

  searchDisplay: {
    defaultIconKey: "FileText",
    documentTypes: {
      asset: { label: "asset", iconKey: "FileText", category: "document" },
      channel: { label: "channel", iconKey: "Folder", category: "folder" },
      experience: {
        label: "experience",
        iconKey: "Presentation",
        category: "presentation",
      },
      tag: { label: "tag", iconKey: "Tags", category: "unknown" },
    },
  },

  features: [
    "Search across all Showpad assets, channels, and shared experiences",
    "Tag indexing for content categorization",
    "updatedSince-based incremental sync",
    "OAuth 2.0 with subdomain-specific authentication",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://SUBDOMAIN.showpad.biz/api/v3/oauth2/authorize",
      tokenUrl: "https://SUBDOMAIN.showpad.biz/api/v3/oauth2/token",
      redirectPath: "/connectors/setup/showpad/oauth/callback",
      scopes: [],
    },
  },

  streams: [
    {
      name: "assets",
      label: "Assets",
      description:
        "Sales content assets (documents, videos, presentations, images)",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Description",
        "Type",
        "Tags",
        "ExpiresAt",
        "CreatedAt",
        "UpdatedAt",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "channels",
      label: "Channels",
      description: "Content channels for organizing and distributing assets",
      entityType: "resource",
      dataPoints: ["Name", "Description", "AssetCount"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "experiences",
      label: "Experiences",
      description:
        "Shared content packages and microsites for buyer engagement",
      entityType: "resource",
      dataPoints: ["Name", "CreatedBy", "Status", "CreatedAt", "UpdatedAt"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "tags",
      label: "Tags",
      description: "Tags used to categorize sales content",
      entityType: "resource",
      dataPoints: ["Name"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Showpad app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "subdomain",
      label: "Showpad Subdomain",
      description: "Your Showpad subdomain (e.g., 'acme' for acme.showpad.biz)",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From the Showpad Admin > Integrations > OAuth Apps",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From the Showpad Admin > Integrations > OAuth Apps",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_channels",
      label: "Sync Channels",
      description: "Index content channels alongside assets",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_experiences",
      label: "Sync Experiences",
      description: "Index shared experiences and microsites",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_tags",
      label: "Sync Tags",
      description: "Index tags used to categorize content",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default showpadApp;
