import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const notionApp: UnifiedApp = {
  id: AppType.NOTION,
  name: "Notion",
  category: "Documents & Collaboration",
  active: true,
  logo: AppType.NOTION,
  short_description: "Search across pages, databases, and blocks.",
  description:
    "Connect Notion to search across pages, databases, and their contents. Supports full content sync with recursive block extraction and real-time webhooks.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Notion Labs, Inc.",
  website: "https://notion.so",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      page: { label: "page", iconKey: "FileTextIcon", category: "page" },
      database: { label: "database", iconKey: "TableIcon", category: "page" },
    },
  },

  features: [
    "Semantic search across pages and databases",
    "Recursive block content extraction",
    "Database property indexing",
    "Real-time push notifications via webhooks",
    "Comment sync and indexing",
    "OAuth 2.0 authentication",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://api.notion.com/v1/oauth/authorize",
      tokenUrl: "https://api.notion.com/v1/oauth/token",
      redirectPath: "/connectors/setup/notion/oauth/callback",
      scopes: [],
    },
  },

  streams: [
    {
      name: "pages",
      label: "Pages",
      description: "Notion pages and their content",
      entityType: "resource",
      dataPoints: [
        "Title",
        "Content",
        "Created",
        "Modified",
        "Author",
        "Parent",
      ],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "databases",
      label: "Databases",
      description: "Notion databases and their entries",
      entityType: "resource",
      dataPoints: ["Title", "Properties", "Schema", "Entries"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "comments",
      label: "Comments",
      description: "Comments on pages and blocks",
      entityType: "activity",
      dataPoints: ["Text", "Author", "Created", "Parent"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "From Notion integrations page",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-integration-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Notion integrations page",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "extract_content",
      label: "Extract Content",
      description: "Extract full text content from all block types.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "extract_comments",
      label: "Extract Comments",
      description: "Include comments in page content.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "max_block_depth",
      label: "Max Block Depth",
      description: "Maximum depth for nested block extraction (1-10).",
      type: "number",
      required: false,
      value: 10,
    },
    {
      id: "enable_push_notifications",
      label: "Real-time Updates",
      description: "Receive instant updates via Notion webhooks.",
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

export default notionApp;
