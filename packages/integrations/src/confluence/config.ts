import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const confluenceApp: UnifiedApp = {
  id: AppType.CONFLUENCE,
  name: "Confluence",
  category: "Collaboration",
  active: true,
  logo: AppType.CONFLUENCE,
  short_description:
    "Search across wiki pages, blog posts, and knowledge bases.",
  description:
    "Connect Atlassian Confluence to search across spaces, pages, and blog posts. Supports OAuth 2.0 (3LO) with incremental sync via CQL.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Atlassian",
  website: "https://www.atlassian.com/software/confluence",

  searchDisplay: {
    defaultIconKey: "FileText",
    documentTypes: {
      page: { label: "page", iconKey: "FileText", category: "document" },
      blogpost: {
        label: "blog post",
        iconKey: "BookOpen",
        category: "document",
      },
    },
  },

  features: [
    "Semantic search across wiki pages and blog posts",
    "Incremental sync via CQL timestamp filtering",
    "Space-level filtering and permissions",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://auth.atlassian.com/authorize",
      tokenUrl: "https://auth.atlassian.com/oauth/token",
      redirectPath: "/connectors/setup/confluence/oauth/callback",
      scopes: [
        "read:confluence-content.all",
        "read:confluence-space.summary",
        "read:confluence-user",
        "search:confluence",
        "read:page:confluence",
        "read:blogpost:confluence",
        "read:attachment:confluence",
        "read:space:confluence",
        "offline_access",
        "read:me",
      ],
    },
  },

  streams: [
    {
      name: "pages",
      label: "Pages",
      description: "Wiki pages and their content",
      entityType: "activity",
      dataPoints: ["Title", "Body", "Space", "Author", "Labels"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "blogposts",
      label: "Blog Posts",
      description: "Blog posts and announcements",
      entityType: "activity",
      dataPoints: ["Title", "Body", "Space", "Author"],
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
      description: "Enter Atlassian OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Atlassian Developer Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Atlassian Developer Console",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "include_spaces",
      label: "Include Spaces",
      description: "Only sync these space keys. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "ENG, PRODUCT, OPS",
    },
    {
      id: "exclude_spaces",
      label: "Exclude Spaces",
      description: "Skip these space keys.",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "index_attachments",
      label: "Index Attachments",
      description: "Extract text from attached documents.",
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

export default confluenceApp;
