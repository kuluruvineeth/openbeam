import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const figmaApp: UnifiedApp = {
  id: AppType.FIGMA,
  name: "Figma",
  category: "Design",
  active: true,
  logo: AppType.FIGMA,
  short_description: "Search across design files, components, and comments.",
  description:
    "Connect Figma to search across design files, components, and comments. Supports incremental sync via file modification timestamps.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Figma",
  website: "https://www.figma.com",

  searchDisplay: {
    defaultIconKey: "FileIcon",
    documentTypes: {
      file: { label: "design file", iconKey: "FileIcon", category: "document" },
      comment: {
        label: "comment",
        iconKey: "MessageSquareIcon",
        category: "comment",
      },
      component: {
        label: "component",
        iconKey: "ComponentIcon",
        category: "document",
      },
    },
  },

  features: [
    "Search across design file names and page names",
    "Component name and description indexing",
    "Comment thread indexing",
    "Incremental sync via modification timestamps",
    "OAuth 2.0 with refresh tokens",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://www.figma.com/oauth",
      tokenUrl: "https://api.figma.com/v1/oauth/token",
      redirectPath: "/connectors/setup/figma/oauth/callback",
      scopes: ["file_content:read", "file_comments:read"],
    },
  },

  streams: [
    {
      name: "files",
      label: "Design Files",
      description: "Figma design files with page and component names",
      entityType: "resource",
      dataPoints: ["Name", "Pages", "Components", "LastModified", "Thumbnail"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "comments",
      label: "Comments",
      description: "Comments and threads on design files",
      entityType: "resource",
      dataPoints: ["Message", "Author", "ResolvedAt", "CreatedAt"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "From Figma developer app settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-figma-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Figma developer app settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "team_id",
      label: "Team ID",
      description: "Figma team ID to sync (find in team URL)",
      type: "text",
      required: true,
      value: "",
      placeholder: "123456789",
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Include file comments in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_components",
      label: "Sync Components",
      description:
        "Index component names and descriptions (requires full file fetch)",
      type: "switch",
      required: false,
      value: false,
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
    {
      id: "include_projects",
      label: "Include Projects",
      description: "Comma-separated project IDs to include (empty = all)",
      type: "text",
      required: false,
      value: "",
      placeholder: "project_id_1,project_id_2",
    },
    {
      id: "exclude_projects",
      label: "Exclude Projects",
      description: "Comma-separated project IDs to exclude",
      type: "text",
      required: false,
      value: "",
      placeholder: "project_id_1,project_id_2",
    },
  ],
};

export default figmaApp;
