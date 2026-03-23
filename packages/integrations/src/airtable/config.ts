import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const airtableApp: UnifiedApp = {
  id: AppType.AIRTABLE,
  name: "Airtable",
  category: "Productivity",
  active: true,
  logo: AppType.AIRTABLE,
  short_description: "Search across bases, tables, records, and comments.",
  description:
    "Connect Airtable to search across bases, tables, records, and comments. Supports OAuth 2.0 with PKCE and incremental sync via modified time filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Formagrid Inc.",
  website: "https://www.airtable.com",

  searchDisplay: {
    defaultIconKey: "Table",
    documentTypes: {
      record: { label: "record", iconKey: "FileText", category: "spreadsheet" },
      spreadsheet: {
        label: "table",
        iconKey: "Table",
        category: "spreadsheet",
      },
      comment: {
        label: "comment",
        iconKey: "MessageSquare",
        category: "comment",
      },
    },
  },

  features: [
    "Semantic search across bases, tables, records, and comments",
    "Incremental sync via LAST_MODIFIED_TIME filtering",
    "OAuth 2.0 with PKCE authentication and automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://airtable.com/oauth2/v1/authorize",
      tokenUrl: "https://airtable.com/oauth2/v1/token",
      redirectPath: "/connectors/setup/airtable/oauth/callback",
      scopes: [
        "data.records:read",
        "data.recordComments:read",
        "schema.bases:read",
      ],
    },
  },

  streams: [
    {
      name: "records",
      label: "Records",
      description: "Records across all tables in connected bases",
      entityType: "activity",
      dataPoints: ["Fields", "Table", "Base", "CreatedTime", "ModifiedTime"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "tables",
      label: "Tables",
      description: "Table schemas and field definitions",
      entityType: "resource",
      dataPoints: ["Name", "Fields", "Views", "Base"],
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
      description: "Enter Airtable OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Airtable OAuth integration settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Airtable OAuth integration settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "include_bases",
      label: "Include Bases",
      description:
        "Comma-separated base IDs to sync. Leave empty for all bases.",
      type: "text",
      required: false,
      value: "",
      placeholder: "appXXXXXXXXXX, appYYYYYYYYYY",
    },
    {
      id: "exclude_bases",
      label: "Exclude Bases",
      description: "Comma-separated base IDs to exclude from sync.",
      type: "text",
      required: false,
      value: "",
      placeholder: "appXXXXXXXXXX",
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Index record comments as searchable documents.",
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

export default airtableApp;
