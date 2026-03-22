import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const asanaApp: UnifiedApp = {
  id: AppType.ASANA,
  name: "Asana",
  category: "Project Management",
  active: true,
  logo: AppType.ASANA,
  short_description: "Search across tasks, projects, and comments.",
  description:
    "Connect Asana to search across tasks, projects, and comments. Supports OAuth 2.0 with incremental sync via modified_at filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Asana",
  website: "https://asana.com",

  searchDisplay: {
    defaultIconKey: "CheckSquare",
    documentTypes: {
      task: { label: "task", iconKey: "CheckSquare", category: "task" },
      project: { label: "project", iconKey: "Folder", category: "project" },
      comment: {
        label: "comment",
        iconKey: "MessageCircle",
        category: "comment",
      },
    },
  },

  features: [
    "Semantic search across tasks and comments",
    "Incremental sync via modified_at filtering",
    "Project-level filtering and permissions",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://app.asana.com/-/oauth_authorize",
      tokenUrl: "https://app.asana.com/-/oauth_token",
      redirectPath: "/connectors/setup/asana/oauth/callback",
      scopes: ["default"],
    },
  },

  streams: [
    {
      name: "tasks",
      label: "Tasks",
      description: "Tasks with assignee, due date, tags, and custom fields",
      entityType: "activity",
      dataPoints: [
        "Name",
        "Notes",
        "Assignee",
        "Due Date",
        "Status",
        "Tags",
        "Custom Fields",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "projects",
      label: "Projects",
      description: "Asana projects",
      entityType: "resource",
      dataPoints: ["Name", "Notes", "Owner", "Status", "Team", "Color"],
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
      description: "Enter Asana OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Asana Developer Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Asana Developer Console",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "workspace_gid",
      label: "Workspace GID",
      description:
        "Asana workspace GID to sync. Leave empty to auto-detect from OAuth.",
      type: "text",
      required: false,
      value: "",
      placeholder: "1234567890",
    },
    {
      id: "include_projects",
      label: "Include Projects",
      description:
        "Only sync tasks from these project GIDs. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "1234567890, 0987654321",
    },
    {
      id: "exclude_projects",
      label: "Exclude Projects",
      description: "Skip tasks from these project GIDs.",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Index task comments as separate documents.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_completed_tasks",
      label: "Sync Completed Tasks",
      description: "Include completed tasks in sync.",
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
  ],
};

export default asanaApp;
