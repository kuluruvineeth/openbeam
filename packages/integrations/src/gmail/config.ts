import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const gmailApp: UnifiedApp = {
  id: AppType.GMAIL,
  name: "Gmail",
  category: "Communication",
  active: true,
  logo: AppType.GMAIL,
  short_description: "Search across emails, threads, and attachments.",
  description:
    "Connect Gmail to search across emails, threads, and attachments. Supports OAuth for personal accounts and Service Account for Google Workspace.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://mail.google.com",

  searchDisplay: {
    defaultIconKey: "Mail",
    documentTypes: {
      email: { label: "email", iconKey: "Mail", category: "email" },
      message: { label: "email", iconKey: "Mail", category: "email" },
      thread: { label: "thread", iconKey: "Mail", category: "email" },
      attachment: {
        label: "attachment",
        iconKey: "Attachment",
        category: "file",
      },
    },
  },

  features: [
    "Semantic search across emails and threads",
    "Attachment content indexing",
    "Label and folder organization",
    "OAuth for personal accounts",
    "Service Account for Google Workspace",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/gmail/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "messages",
      label: "Emails",
      description: "Email messages and threads",
      entityType: "activity",
      dataPoints: ["Subject", "Body", "Sender", "Recipients", "Date", "Labels"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "attachments",
      label: "Attachments",
      description: "Files attached to emails",
      entityType: "resource",
      dataPoints: ["Filename", "Type", "Size"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "labels",
      label: "Labels",
      description: "Gmail labels and folders",
      entityType: "resource",
      dataPoints: ["Name", "Type"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    // Auth method selector
    {
      id: "auth_method",
      label: "Authentication",
      description:
        "OAuth for personal accounts, Service Account for Workspace.",
      type: "select",
      required: true,
      value: "oauth",
      options: [
        { label: "OAuth 2.0", value: "oauth" },
        { label: "Service Account", value: "service_account" },
      ],
    },

    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Upload JSON from Google Cloud Console or enter manually.",
      type: "select",
      required: true,
      value: "file",
      options: [
        { label: "Upload JSON", value: "file" },
        { label: "Enter manually", value: "manual" },
      ],
      dependsOn: { field: "auth_method", value: "oauth" },
    },
    {
      id: "oauth_credentials_file",
      label: "OAuth Credentials",
      description: "Credentials → OAuth 2.0 Client IDs → Download JSON",
      type: "file",
      required: true,
      value: "",
      accept: ".json",
      fileType: "json",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "file" },
      ],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Google Cloud Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "123456789.apps.googleusercontent.com",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "manual" },
      ],
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Google Cloud Console",
      type: "password",
      required: true,
      value: "",
      dependsOn: [
        { field: "auth_method", value: "oauth" },
        { field: "oauth_input_method", value: "manual" },
      ],
    },

    {
      id: "sa_input_method",
      label: "Credentials",
      description: "Upload JSON key file or paste contents.",
      type: "select",
      required: true,
      value: "file",
      options: [
        { label: "Upload JSON", value: "file" },
        { label: "Paste JSON", value: "paste" },
      ],
      dependsOn: { field: "auth_method", value: "service_account" },
    },
    {
      id: "service_account_file",
      label: "Service Account Key",
      description: "IAM → Service Accounts → Keys → Create new key (JSON)",
      type: "file",
      required: true,
      value: "",
      accept: ".json",
      fileType: "json",
      dependsOn: [
        { field: "auth_method", value: "service_account" },
        { field: "sa_input_method", value: "file" },
      ],
    },
    {
      id: "service_account_json",
      label: "Service Account JSON",
      description: "Paste the full JSON key file contents",
      type: "textarea",
      required: true,
      value: "",
      rows: 8,
      dependsOn: [
        { field: "auth_method", value: "service_account" },
        { field: "sa_input_method", value: "paste" },
      ],
    },
    {
      id: "delegated_email",
      label: "Admin Email",
      description:
        "Workspace admin email to impersonate for domain-wide access.",
      type: "text",
      required: true,
      value: "",
      placeholder: "admin@company.com",
      dependsOn: { field: "auth_method", value: "service_account" },
    },

    {
      id: "include_labels",
      label: "Include Labels",
      description: "Only sync emails with these labels. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "INBOX, IMPORTANT",
    },
    {
      id: "exclude_labels",
      label: "Exclude Labels",
      description: "Skip emails with these labels.",
      type: "text",
      required: false,
      value: "SPAM, TRASH",
    },
    {
      id: "index_attachments",
      label: "Index Attachments",
      description: "Extract text from PDFs and documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync on first run.",
      type: "text",
      required: false,
      value: "90",
    },
  ],
};

export default gmailApp;
