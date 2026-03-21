import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const dropboxApp: UnifiedApp = {
  id: AppType.DROPBOX,
  name: "Dropbox",
  category: "File Storage",
  active: true,
  logo: AppType.DROPBOX,
  short_description: "Search across files and folders stored in Dropbox.",
  description:
    "Connect Dropbox to search across files, folders, and shared content. Supports OAuth 2.0 with cursor-based incremental sync for efficient change detection.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Dropbox, Inc.",
  website: "https://www.dropbox.com",

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
    },
  },

  features: [
    "Search across all Dropbox files and folders",
    "Cursor-based incremental sync for efficient updates",
    "File type detection from extensions",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://www.dropbox.com/oauth2/authorize",
      tokenUrl: "https://api.dropboxapi.com/oauth2/token",
      redirectPath: "/connectors/setup/dropbox/oauth/callback",
      scopes: [
        "files.metadata.read",
        "files.content.read",
        "account_info.read",
        "sharing.read",
      ],
    },
  },

  streams: [
    {
      name: "files",
      label: "Files",
      description: "Files stored in Dropbox",
      entityType: "resource",
      dataPoints: ["Name", "Path", "Size", "Modified", "ContentHash"],
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
      description: "Enter Dropbox app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "App Key",
      description: "From the Dropbox App Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-app-key",
    },
    {
      id: "client_secret",
      label: "App Secret",
      description: "From the Dropbox App Console",
      type: "password",
      required: true,
      value: "",
    },
  ],
};

export default dropboxApp;
