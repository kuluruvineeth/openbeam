import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const intercomApp: UnifiedApp = {
  id: AppType.INTERCOM,
  name: "Intercom",
  category: "Support",
  active: true,
  logo: AppType.INTERCOM,
  short_description:
    "Search across conversations, help center articles, and contacts.",
  description:
    "Connect Intercom to search conversations, help center articles, collections, and contacts. Supports OAuth 2.0 with search-based incremental sync for conversations.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Intercom, Inc.",
  website: "https://www.intercom.com",

  searchDisplay: {
    defaultIconKey: "MessageSquare",
    documentTypes: {
      conversation: {
        label: "conversation",
        iconKey: "MessageSquare",
        category: "support",
      },
      article: { label: "article", iconKey: "FileText", category: "article" },
      collection: {
        label: "collection",
        iconKey: "Folder",
        category: "folder",
      },
      contact: { label: "contact", iconKey: "User", category: "contact" },
    },
  },

  features: [
    "Search across conversations and articles",
    "Incremental sync via updated_at search filter",
    "Conversations, help center articles, collections, contacts",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://app.intercom.com/oauth",
      tokenUrl: "https://api.intercom.io/auth/eagle/token",
      redirectPath: "/connectors/setup/intercom/oauth/callback",
      scopes: [],
    },
  },

  streams: [
    {
      name: "conversations",
      label: "Conversations",
      description:
        "Support conversations with messages, assignee, state, and tags",
      entityType: "activity",
      dataPoints: ["Title", "Messages", "State", "Assignee", "Tags"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "articles",
      label: "Help Center Articles",
      description: "Knowledge base articles with title, body, and author",
      entityType: "resource",
      dataPoints: ["Title", "Body", "Description", "Author", "State"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "collections",
      label: "Article Collections",
      description: "Help center article categories and groupings",
      entityType: "resource",
      dataPoints: ["Name", "Description"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 120,
      supportsBackfill: true,
    },
    {
      name: "contacts",
      label: "Contacts",
      description: "Users and leads with name, email, and company",
      entityType: "resource",
      dataPoints: ["Name", "Email", "Role", "Company"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Intercom OAuth credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "Intercom OAuth client identifier from Developer Hub",
      type: "text",
      required: true,
      value: "",
      placeholder: "your_client_id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Intercom OAuth client secret from Developer Hub",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_conversations",
      label: "Sync Conversations",
      description: "Index conversations as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_articles",
      label: "Sync Articles",
      description: "Index Help Center articles.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_collections",
      label: "Sync Collections",
      description: "Index article collections (categories).",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_contacts",
      label: "Sync Contacts",
      description:
        "Index contacts (users and leads). May be large for workspaces with many contacts.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Only sync conversations created within this many days. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
    {
      id: "state_filter",
      label: "Conversation State Filter",
      description:
        "Only sync conversations in this state (open, closed, snoozed). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "All states",
    },
    {
      id: "tags_filter",
      label: "Tags Filter",
      description:
        "Only sync conversations with these tags (comma-separated). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "priority, escalated",
    },
  ],
};

export default intercomApp;
