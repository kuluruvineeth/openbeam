import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const zendeskApp: UnifiedApp = {
  id: AppType.ZENDESK,
  name: "Zendesk",
  category: "Support",
  active: true,
  logo: AppType.ZENDESK,
  short_description:
    "Search across tickets, help center articles, and comments.",
  description:
    "Connect Zendesk to search across support tickets, help center articles, and ticket comments. Supports OAuth 2.0 with cursor-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Zendesk, Inc.",
  website: "https://www.zendesk.com",

  searchDisplay: {
    defaultIconKey: "Ticket",
    documentTypes: {
      ticket: { label: "ticket", iconKey: "Ticket", category: "ticket" },
      article: { label: "article", iconKey: "FileText", category: "article" },
      comment: {
        label: "comment",
        iconKey: "MessageSquare",
        category: "comment",
      },
    },
  },

  features: [
    "Semantic search across tickets and articles",
    "Incremental sync via cursor-based API",
    "Tickets, help center articles, and comments",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://subdomain.zendesk.com/oauth/authorizations/new",
      tokenUrl: "https://subdomain.zendesk.com/oauth/tokens",
      redirectPath: "/connectors/setup/zendesk/oauth/callback",
      scopes: ["read", "tickets:read", "users:read", "hc:read"],
    },
  },

  streams: [
    {
      name: "tickets",
      label: "Tickets",
      description: "Support tickets with subject, description, and metadata",
      entityType: "activity",
      dataPoints: ["Subject", "Description", "Status", "Priority", "Assignee"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "articles",
      label: "Help Center Articles",
      description: "Knowledge base articles from Zendesk Guide",
      entityType: "resource",
      dataPoints: ["Title", "Body", "Section", "Author", "Labels"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "comments",
      label: "Ticket Comments",
      description: "Comments and replies on support tickets",
      entityType: "activity",
      dataPoints: ["Body", "Author", "CreatedAt"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "subdomain",
      label: "Subdomain",
      description:
        "Your Zendesk subdomain (e.g., 'mycompany' from mycompany.zendesk.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "mycompany",
    },
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Zendesk OAuth credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "Zendesk OAuth client identifier",
      type: "text",
      required: true,
      value: "",
      placeholder: "your_client_id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Zendesk OAuth client secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Index ticket comments as searchable documents.",
      type: "switch",
      required: false,
      value: false,
    },
  ],
};

export default zendeskApp;
