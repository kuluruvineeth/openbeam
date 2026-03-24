import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const canvaApp: UnifiedApp = {
  id: AppType.CANVA,
  name: "Canva",
  category: "Design",
  active: true,
  logo: AppType.CANVA,
  short_description:
    "Search across designs, brand templates, folders, and comments.",
  description:
    "Connect Canva to search across designs, brand templates, folders, and comments. Supports OAuth 2.0 with PKCE and incremental sync via updated_at filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Canva Pty Ltd",
  website: "https://www.canva.com",

  searchDisplay: {
    defaultIconKey: "Image",
    documentTypes: {
      design: { label: "design", iconKey: "Image", category: "design" },
      brand_template: {
        label: "brand template",
        iconKey: "Layout",
        category: "design",
      },
      folder: { label: "folder", iconKey: "Folder", category: "folder" },
      comment: {
        label: "comment",
        iconKey: "MessageSquare",
        category: "comment",
      },
    },
  },

  features: [
    "Semantic search across designs, brand templates, folders, and comments",
    "Incremental sync via updated_at filtering on designs",
    "OAuth 2.0 with PKCE authentication and automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://www.canva.com/api/oauth/authorize",
      tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
      redirectPath: "/connectors/setup/canva/oauth/callback",
      scopes: [
        "design:content:read",
        "design:meta:read",
        "folder:read",
        "brandtemplate:content:read",
        "brandtemplate:meta:read",
        "asset:read",
        "comment:read",
        "design:content:write",
        "folder:write",
      ],
    },
  },

  streams: [
    {
      name: "designs",
      label: "Designs",
      description: "User designs across all types",
      entityType: "resource",
      dataPoints: ["Title", "Type", "Owner", "CreatedAt", "UpdatedAt", "URL"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "brand_templates",
      label: "Brand Templates",
      description: "Team brand templates for consistent design",
      entityType: "resource",
      dataPoints: ["Title", "Description", "CreatedAt", "UpdatedAt"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Design folders and project organization",
      entityType: "resource",
      dataPoints: ["Name", "CreatedAt", "UpdatedAt"],
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
      description: "Enter Canva OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Canva Developer Portal integration settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "OCAxxxxxxxxx...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Canva Developer Portal integration settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_brand_templates",
      label: "Sync Brand Templates",
      description: "Index brand templates as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_folders",
      label: "Sync Folders",
      description: "Index folders as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Index design comments as searchable documents.",
      type: "switch",
      required: false,
      value: false,
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

export default canvaApp;
