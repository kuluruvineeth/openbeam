import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const onenoteApp: UnifiedApp = {
  id: AppType.ONENOTE,
  name: "OneNote",
  category: "Knowledge Base",
  active: true,
  logo: AppType.ONENOTE,
  short_description:
    "Search across notebooks, sections, and pages in Microsoft OneNote.",
  description:
    "Connect Microsoft OneNote to search across notebooks and pages via Microsoft Graph API. Indexes page content, section hierarchy, and notebook metadata.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft Corporation",
  website: "https://www.onenote.com",

  searchDisplay: {
    defaultIconKey: "Notebook",
    documentTypes: {
      page: { label: "page", iconKey: "FileText", category: "page" },
      notebook: { label: "notebook", iconKey: "Notebook", category: "folder" },
      section: { label: "section", iconKey: "Folder", category: "folder" },
    },
  },

  features: [
    "Full-text search across OneNote pages",
    "Notebook and section hierarchy indexing",
    "Incremental sync via lastModifiedDateTime",
    "HTML content extraction from pages",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      redirectPath: "/connectors/setup/onenote/oauth/callback",
      scopes: ["Notes.Read", "Notes.Read.All", "User.Read", "offline_access"],
    },
  },

  streams: [
    {
      name: "pages",
      label: "Pages",
      description: "OneNote pages with content",
      entityType: "activity",
      dataPoints: ["Title", "Content", "Author", "Notebook", "Section"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "notebooks",
      label: "Notebooks",
      description: "OneNote notebooks",
      entityType: "resource",
      dataPoints: ["Name", "Owner", "Created", "Modified"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "sections",
      label: "Sections",
      description: "OneNote sections within notebooks",
      entityType: "resource",
      dataPoints: ["Name", "Notebook", "Created", "Modified"],
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
      description: "From Azure AD app registration > Certificates & secrets",
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
      id: "include_notebooks",
      label: "Include Notebooks",
      description: "Only sync pages from these notebooks. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Work Notes, Project Docs",
    },
    {
      id: "exclude_notebooks",
      label: "Exclude Notebooks",
      description: "Skip pages in these notebooks.",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "sync_page_content",
      label: "Sync Page Content",
      description: "Fetch and index full HTML content of pages.",
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

export default onenoteApp;
