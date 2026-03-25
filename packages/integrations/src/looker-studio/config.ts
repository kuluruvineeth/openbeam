import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const lookerStudioApp: UnifiedApp = {
  id: AppType.LOOKER_STUDIO,
  name: "Looker Studio",
  category: "Analytics & BI",
  active: true,
  logo: AppType.LOOKER_STUDIO,
  short_description:
    "Search across dashboards, reports, and data visualizations.",
  description:
    "Connect Looker Studio to search across interactive dashboards, reports, and data visualizations. Uses Google Drive API to discover Looker Studio reports by MIME type and extract metadata.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://lookerstudio.google.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      report: {
        label: "report",
        iconKey: "BarChart2",
        category: "document",
      },
      data_source: {
        label: "data source",
        iconKey: "Database",
        category: "document",
      },
    },
  },

  features: [
    "Search across Looker Studio reports and dashboards",
    "Report metadata and ownership indexing",
    "Data source discovery and cataloging",
    "OAuth for personal accounts",
    "Domain-wide delegation for Google Workspace",
    "Incremental sync via modifiedTime filtering",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/looker-studio/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "reports",
      label: "Reports",
      description: "Looker Studio reports and dashboards",
      entityType: "resource",
      dataPoints: ["Name", "Owner", "Created", "Modified", "URL"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "data_sources",
      label: "Data Sources",
      description: "Connected data sources powering reports",
      entityType: "resource",
      dataPoints: ["Name", "Owner", "Created", "Modified", "Type"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
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
      description: "Credentials -> OAuth 2.0 Client IDs -> Download JSON",
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
      description: "IAM -> Service Accounts -> Keys -> Create new key (JSON)",
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
  ],
};

export default lookerStudioApp;
