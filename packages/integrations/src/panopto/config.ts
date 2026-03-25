import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const panoptoApp: UnifiedApp = {
  id: AppType.PANOPTO,
  name: "Panopto",
  category: "Video Platform",
  active: true,
  logo: AppType.PANOPTO,
  short_description: "Search across videos, folders, and playlists in Panopto.",
  description:
    "Connect Panopto to search across video sessions, folders, and playlists. Supports OAuth 2.0 with instance-specific URLs and incremental sync via creation date ordering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Panopto, Inc.",
  website: "https://www.panopto.com",

  searchDisplay: {
    defaultIconKey: "Video",
    documentTypes: {
      session: {
        label: "video",
        iconKey: "Video",
        category: "recording",
      },
      folder: {
        label: "folder",
        iconKey: "Folder",
        category: "folder",
      },
      playlist: {
        label: "playlist",
        iconKey: "FileText",
        category: "document",
      },
    },
  },

  features: [
    "Search across all Panopto video sessions",
    "Index folder hierarchies and playlists",
    "Incremental sync by creation date",
    "Instance-specific OAuth 2.0 authentication",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://INSTANCE/Panopto/oauth2/connect/authorize",
      tokenUrl: "https://INSTANCE/Panopto/oauth2/connect/token",
      redirectPath: "/connectors/setup/panopto/oauth/callback",
      scopes: ["api", "openid"],
    },
  },

  streams: [
    {
      name: "sessions",
      label: "Video Sessions",
      description: "Videos and recordings in Panopto",
      entityType: "resource",
      dataPoints: [
        "Title",
        "Description",
        "Duration",
        "Views",
        "Created",
        "Folder",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Video folder collections in Panopto",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Parent", "Sessions Count"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "playlists",
      label: "Playlists",
      description: "Curated playlists of video sessions",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Sessions"],
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
      description: "Enter Panopto app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "instance_url",
      label: "Panopto Instance URL",
      description:
        "Your Panopto instance URL (e.g., 'https://yourorg.hosted.panopto.com')",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://yourorg.hosted.panopto.com",
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From the Panopto Identity Provider configuration",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From the Panopto Identity Provider configuration",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_playlists",
      label: "Sync Playlists",
      description: "Index playlists alongside videos and folders",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default panoptoApp;
