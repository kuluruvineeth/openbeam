import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const clickUpApp: UnifiedApp = {
  id: AppType.CLICKUP,
  name: "ClickUp",
  category: "Project Management",
  active: true,
  logo: AppType.CLICKUP,
  short_description: "Search across tasks, spaces, and lists.",
  description:
    "Connect ClickUp to search across tasks, comments, spaces, lists, and folders. Supports incremental sync via date_updated_gt filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "ClickUp",
  website: "https://clickup.com",

  searchDisplay: {
    defaultIconKey: "CircleDotIcon",
    documentTypes: {
      task: { label: "task", iconKey: "CircleDotIcon", category: "task" },
      list: { label: "list", iconKey: "ListIcon", category: "task" },
      comment: {
        label: "comment",
        iconKey: "MessageSquareIcon",
        category: "comment",
      },
    },
  },

  features: [
    "Full-text search across tasks and comments",
    "Space, folder, and list hierarchy",
    "Task metadata: status, priority, assignees, tags, custom fields",
    "Incremental sync with date_updated_gt",
    "OAuth 2.0 authentication",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://app.clickup.com/api",
      tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
      redirectPath: "/connectors/setup/clickup/oauth/callback",
      scopes: [],
    },
  },

  streams: [
    {
      name: "tasks",
      label: "Tasks",
      description: "ClickUp tasks with status, assignees, and custom fields",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Priority",
        "Assignees",
        "Tags",
        "Custom Fields",
        "Due Date",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "lists",
      label: "Lists",
      description: "ClickUp lists within spaces and folders",
      entityType: "resource",
      dataPoints: ["Name", "Content", "Status", "Task Count"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "comments",
      label: "Comments",
      description: "Task comments and discussions",
      entityType: "resource",
      dataPoints: ["Text", "Author", "Created At"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "From ClickUp OAuth application settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-clickup-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From ClickUp OAuth application settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "workspace_id",
      label: "Workspace ID",
      description: "ClickUp Team/Workspace ID (auto-detected on connect)",
      type: "text",
      required: false,
      value: "",
      placeholder: "Auto-detected",
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Include task comments in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "include_spaces",
      label: "Include Spaces",
      description:
        "Comma-separated space IDs to sync. Leave empty for all spaces.",
      type: "text",
      required: false,
      value: "",
      placeholder: "All spaces",
    },
    {
      id: "exclude_spaces",
      label: "Exclude Spaces",
      description: "Comma-separated space IDs to exclude from sync.",
      type: "text",
      required: false,
      value: "",
      placeholder: "None",
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

export default clickUpApp;
