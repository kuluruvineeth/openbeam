import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const googleSitesApp: UnifiedApp = {
  id: AppType.GOOGLE_SITES,
  name: "Google Sites",
  category: "Documents & Storage",
  active: true,
  logo: AppType.GOOGLE_SITES,
  short_description:
    "Search across internal wikis, project sites, and team portals.",
  description:
    "Connect Google Sites to search across internal company wikis, project sites, team portals, and documentation hubs. Uses Google Drive API to discover sites and extract page content.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://sites.google.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      wiki: { label: "site", iconKey: "Globe", category: "wiki" },
      page: { label: "page", iconKey: "FileTextIcon", category: "page" },
    },
  },

  features: [
    "Semantic search across Google Sites pages",
    "HTML content extraction and text indexing",
    "Site-level and page-level metadata",
    "OAuth for personal accounts",
    "Domain-wide delegation for Google Workspace",
    "Incremental sync via modifiedTime filtering",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/google-sites/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "sites",
      label: "Sites",
      description: "Google Sites wikis and project sites",
      entityType: "resource",
      dataPoints: ["Name", "Owner", "Created", "Modified", "URL"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "pages",
      label: "Pages",
      description: "Individual pages within Google Sites",
      entityType: "resource",
      dataPoints: ["Title", "Content", "Site", "Owner", "Modified"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
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
    {
      id: "include_sites",
      label: "Include Sites",
      description: "Only sync these sites by name. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Engineering Wiki, Product Portal",
    },
    {
      id: "exclude_sites",
      label: "Exclude Sites",
      description: "Skip these sites by name.",
      type: "text",
      required: false,
      value: "",
    },
  ],
};

export default googleSitesApp;
