import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const sharePointApp: UnifiedApp = {
  id: AppType.SHAREPOINT,
  name: "SharePoint",
  category: "Knowledge Base",
  active: true,
  logo: AppType.SHAREPOINT,
  short_description:
    "Search across SharePoint sites, documents, and list items.",
  description:
    "Connect Microsoft SharePoint to search across sites, document libraries, and lists via Microsoft Graph API. Supports OAuth for organizational accounts.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft Corporation",
  website: "https://www.microsoft.com/microsoft-365/sharepoint",

  searchDisplay: {
    defaultIconKey: "File",
    documentTypes: {
      file: { label: "file", iconKey: "File", category: "file" },
    },
  },

  features: [
    "Semantic search across documents and list items",
    "Delta sync for incremental updates",
    "Site and document library discovery",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      redirectPath: "/connectors/setup/sharepoint/oauth/callback",
      scopes: [
        "Files.Read.All",
        "Sites.Read.All",
        "User.Read",
        "offline_access",
      ],
    },
  },

  streams: [
    {
      name: "files",
      label: "Files",
      description: "Documents stored in SharePoint document libraries",
      entityType: "resource",
      dataPoints: ["Name", "Content", "Author", "Modified", "Site"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "list_items",
      label: "List Items",
      description: "Items from SharePoint lists",
      entityType: "resource",
      dataPoints: ["Title", "Fields", "Author", "Modified", "List"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
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
      id: "include_sites",
      label: "Include Sites",
      description:
        "Only sync these SharePoint sites. Leave empty for all accessible sites.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Marketing, Engineering Wiki",
    },
    {
      id: "exclude_sites",
      label: "Exclude Sites",
      description: "Skip these SharePoint sites.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Archive, Legacy",
    },
    {
      id: "index_file_contents",
      label: "Index File Contents",
      description:
        "Extract and index text content from documents (PDF, Word, Excel).",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_list_items",
      label: "Sync List Items",
      description: "Index items from SharePoint lists in addition to files.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "max_file_size_mb",
      label: "Max File Size (MB)",
      description: "Skip files larger than this. Leave empty for no limit.",
      type: "text",
      required: false,
      value: "100",
      placeholder: "100",
    },
  ],
};

export default sharePointApp;
