import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const insidedApp: UnifiedApp = {
  id: AppType.INSIDED,
  name: "InSided",
  category: "Customer Community",
  active: true,
  logo: AppType.INSIDED,
  short_description:
    "Search community posts, knowledge base articles, and product ideas from InSided",
  description:
    "Connect InSided (Gainsight Customer Communities) to search across community forums, knowledge base articles, and product ideation boards. Supports API key authentication with page-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Gainsight",
  website: "https://www.insided.com",

  searchDisplay: {
    defaultIconKey: "MessageSquareIcon",
    documentTypes: {
      post: {
        label: "post",
        iconKey: "MessageSquareIcon",
        category: "message",
      },
      article: {
        label: "article",
        iconKey: "FileTextIcon",
        category: "document",
      },
      idea: {
        label: "idea",
        iconKey: "LightbulbIcon",
        category: "task",
      },
    },
  },

  features: [
    "Community forum posts with replies and reactions",
    "Knowledge base articles with categories",
    "Product ideation posts with vote counts and status",
    "Incremental sync via updated_after timestamp filter",
    "Category-based content organization",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://api.insided.com/docs",
    },
  },

  streams: [
    {
      name: "posts",
      label: "Posts",
      description:
        "Community forum posts with replies, reactions, and author details",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Category",
        "Replies",
        "Reactions",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "articles",
      label: "Articles",
      description:
        "Knowledge base articles with content, categories, and author information",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Category",
        "Status",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "ideas",
      label: "Ideas",
      description:
        "Product feedback ideas with vote counts, status, and categories",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Category",
        "Status",
        "Votes",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "InSided API key. Generate from your community admin panel under Settings > API.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your InSided API key",
    },
    {
      id: "community_url",
      label: "Community URL",
      description:
        "Your InSided community URL (e.g., 'https://community.example.com' or 'https://example.insided.com')",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://community.example.com",
    },
    {
      id: "sync_articles",
      label: "Sync Articles",
      description: "Include knowledge base articles in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_ideas",
      label: "Sync Ideas",
      description: "Include product ideation posts in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default insidedApp;
