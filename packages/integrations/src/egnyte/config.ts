import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const egnyteApp: UnifiedApp = {
  id: AppType.EGNYTE,
  name: "Egnyte",
  category: "File Storage",
  active: true,
  logo: AppType.EGNYTE,
  short_description: "Search across files and folders stored in Egnyte.",
  description:
    "Connect Egnyte to search across files, folders, and shared links. Supports OAuth 2.0 with events-based incremental sync for efficient change detection.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Egnyte, Inc.",
  website: "https://www.egnyte.com",

  searchDisplay: {
    defaultIconKey: "File",
    documentTypes: {
      file: { label: "file", iconKey: "FileText", category: "file" },
      document: { label: "document", iconKey: "FileText", category: "file" },
      spreadsheet: {
        label: "spreadsheet",
        iconKey: "Table",
        category: "file",
      },
      presentation: {
        label: "presentation",
        iconKey: "Presentation",
        category: "file",
      },
      image: { label: "image", iconKey: "Image", category: "file" },
      folder: { label: "folder", iconKey: "Folder", category: "folder" },
      link: { label: "shared link", iconKey: "Link", category: "file" },
    },
  },

  features: [
    "Search across all Egnyte files and folders",
    "Events-based incremental sync for efficient updates",
    "Shared link indexing",
    "File type detection from extensions",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://DOMAIN.egnyte.com/puboauth/token",
      tokenUrl: "https://DOMAIN.egnyte.com/puboauth/token",
      redirectPath: "/connectors/setup/egnyte/oauth/callback",
      scopes: ["Egnyte.filesystem", "Egnyte.link", "Egnyte.user"],
    },
  },

  streams: [
    {
      name: "files",
      label: "Files & Folders",
      description: "Files and folders stored in Egnyte",
      entityType: "resource",
      dataPoints: ["Name", "Path", "Size", "Modified", "Checksum", "Locked"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "links",
      label: "Shared Links",
      description: "Shared links created in Egnyte",
      entityType: "resource",
      dataPoints: ["Path", "Type", "Accessibility", "Created", "Expiry"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Egnyte app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "domain",
      label: "Egnyte Domain",
      description: "Your Egnyte subdomain (e.g., 'acme' for acme.egnyte.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From the Egnyte Developer Portal",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From the Egnyte Developer Portal",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "root_folder_path",
      label: "Root Folder Path",
      description:
        "Folder path to sync from (e.g., '/Shared'). Default: '/Shared'",
      type: "text",
      required: false,
      value: "/Shared",
      placeholder: "/Shared",
    },
    {
      id: "sync_shared_links",
      label: "Sync Shared Links",
      description: "Index shared links alongside files and folders",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "file_types_filter",
      label: "File Types Filter",
      description:
        "Comma-separated list of extensions to include (e.g., pdf,docx,xlsx). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "pdf,docx,xlsx,pptx",
    },
    {
      id: "max_file_size_mb",
      label: "Max File Size (MB)",
      description:
        "Skip files larger than this size. Leave empty for no limit.",
      type: "text",
      required: false,
      value: "",
      placeholder: "100",
    },
  ],
};

export default egnyteApp;
