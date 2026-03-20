import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const outlookApp: UnifiedApp = {
  id: AppType.OUTLOOK,
  name: "Outlook",
  category: "Communication",
  active: true,
  logo: AppType.OUTLOOK,
  short_description: "Search across emails, calendar events, and contacts.",
  description:
    "Connect Microsoft Outlook to search across emails via Microsoft Graph API. Supports OAuth for personal and organizational accounts.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft Corporation",
  website: "https://outlook.live.com",

  searchDisplay: {
    defaultIconKey: "Mail",
    documentTypes: {
      email: { label: "email", iconKey: "Mail", category: "email" },
    },
  },

  features: [
    "Semantic search across emails",
    "Delta sync for incremental updates",
    "Thread-aware conversation grouping",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      redirectPath: "/connectors/setup/outlook/oauth/callback",
      scopes: ["Mail.Read", "User.Read", "offline_access"],
    },
  },

  streams: [
    {
      name: "messages",
      label: "Emails",
      description: "Email messages and conversations",
      entityType: "activity",
      dataPoints: ["Subject", "Body", "Sender", "Recipients", "Date"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Azure AD app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Application (client) ID",
      description: "From Azure AD app registration",
      type: "text",
      required: true,
      value: "",
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Azure AD app registration → Certificates & secrets",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "tenant_id",
      label: "Tenant ID",
      description: "Azure AD tenant. Leave 'common' for multi-tenant.",
      type: "text",
      required: false,
      value: "common",
      placeholder: "common",
    },
    {
      id: "include_folders",
      label: "Include Folders",
      description: "Only sync emails from these folders. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Inbox, Sent Items",
    },
    {
      id: "exclude_folders",
      label: "Exclude Folders",
      description: "Skip emails in these folders.",
      type: "text",
      required: false,
      value: "Junk Email, Deleted Items",
    },
    {
      id: "index_attachments",
      label: "Index Attachments",
      description: "Extract text from PDFs, documents, and images.",
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

export default outlookApp;
