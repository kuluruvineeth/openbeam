import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const pipedriveApp: UnifiedApp = {
  id: AppType.PIPEDRIVE,
  name: "Pipedrive",
  category: "CRM",
  active: true,
  logo: AppType.PIPEDRIVE,
  short_description:
    "Search across deals, contacts, organizations, activities, and notes.",
  description:
    "Connect Pipedrive to search across CRM data including deals, contacts (persons), organizations, activities, and notes. Supports OAuth 2.0 with timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Pipedrive OÜ",
  website: "https://www.pipedrive.com",

  searchDisplay: {
    defaultIconKey: "TrendingUp",
    documentTypes: {
      deal: { label: "deal", iconKey: "TrendingUp", category: "deal" },
      person: { label: "person", iconKey: "UserCircle", category: "contact" },
      organization: {
        label: "organization",
        iconKey: "Building",
        category: "account",
      },
      activity: { label: "activity", iconKey: "Calendar", category: "event" },
      note: { label: "note", iconKey: "FileText", category: "comment" },
    },
  },

  features: [
    "Semantic search across deals, contacts, organizations, activities, and notes",
    "Incremental sync via updated_since timestamp filtering",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://oauth.pipedrive.com/oauth/authorize",
      tokenUrl: "https://oauth.pipedrive.com/oauth/token",
      redirectPath: "/connectors/setup/pipedrive/oauth/callback",
      scopes: ["deals:read", "contacts:read", "activities:read"],
    },
  },

  streams: [
    {
      name: "deals",
      label: "Deals",
      description: "Sales deals and opportunities",
      entityType: "activity",
      dataPoints: ["Title", "Value", "Currency", "Stage", "Pipeline", "Status"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "persons",
      label: "Persons",
      description: "Contacts and people in the CRM",
      entityType: "resource",
      dataPoints: ["Name", "Email", "Phone", "Organization", "Owner"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "organizations",
      label: "Organizations",
      description: "Companies and organizations",
      entityType: "resource",
      dataPoints: ["Name", "Address", "Owner"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "activities",
      label: "Activities",
      description: "Tasks, calls, meetings, and other activities",
      entityType: "activity",
      dataPoints: ["Subject", "Type", "DueDate", "Note", "Done"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "notes",
      label: "Notes",
      description: "Notes attached to deals, persons, and organizations",
      entityType: "resource",
      dataPoints: ["Content", "Deal", "Person", "Organization"],
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
      description: "Enter Pipedrive OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Pipedrive Marketplace app settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Pipedrive Marketplace app settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_activities",
      label: "Sync Activities",
      description:
        "Index activities (calls, meetings, tasks) as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_notes",
      label: "Sync Notes",
      description: "Index notes attached to deals and contacts.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_organizations",
      label: "Sync Organizations",
      description: "Index organizations as searchable documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "pipeline_filter",
      label: "Pipeline Filter",
      description:
        "Comma-separated pipeline IDs to sync. Leave empty for all pipelines.",
      type: "text",
      required: false,
      value: "",
      placeholder: "1, 2, 3",
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

export default pipedriveApp;
