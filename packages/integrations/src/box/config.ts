import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const boxApp: UnifiedApp = {
  id: AppType.BOX,
  name: "Box",
  category: "File Storage",
  active: true,
  logo: AppType.BOX,
  short_description: "Search across files and folders stored in Box.",
  description:
    "Connect Box to search across files, folders, and web links. Supports OAuth 2.0 with events-based incremental sync for efficient change detection.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Box, Inc.",
  website: "https://www.box.com",

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
      web_link: {
        label: "web link",
        iconKey: "Link",
        category: "file",
      },
    },
  },

  features: [
    "Search across all Box files and folders",
    "Events-based incremental sync for efficient updates",
    "File type detection from extensions",
    "Web link indexing",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://account.box.com/api/oauth2/authorize",
      tokenUrl: "https://api.box.com/oauth2/token",
      redirectPath: "/connectors/setup/box/oauth/callback",
      scopes: ["root_readwrite"],
    },
  },

  streams: [
    {
      name: "files",
      label: "Files & Folders",
      description: "Files, folders, and web links stored in Box",
      entityType: "resource",
      dataPoints: ["Name", "Path", "Size", "Modified", "SHA1", "SharedLink"],
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
      description: "Enter Box app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From the Box Developer Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From the Box Developer Console",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "root_folder_id",
      label: "Root Folder ID",
      description: "Folder ID to sync from (0 for root). Default: 0",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
    {
      id: "include_shared_folders",
      label: "Include Shared Folders",
      description: "Also index folders shared with the authenticated user",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_web_links",
      label: "Sync Web Links",
      description: "Index web links (bookmarks) in Box",
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
    {
      id: "exclude_trashed",
      label: "Exclude Trashed Items",
      description: "Skip items in the trash",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default boxApp;
