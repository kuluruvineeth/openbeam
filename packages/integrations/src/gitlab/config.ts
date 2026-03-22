import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const gitlabApp: UnifiedApp = {
  id: AppType.GITLAB,
  name: "GitLab",
  category: "Code & Collaboration",
  active: true,
  logo: AppType.GITLAB,
  short_description:
    "Search across projects, issues, merge requests, and wiki pages.",
  description:
    "Connect GitLab to search and reason across projects, issues, merge requests, and wiki content. Supports OAuth with refresh token rotation, self-hosted instances, and incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "GitLab Inc.",
  website: "https://gitlab.com",

  searchDisplay: {
    defaultIconKey: "GitBranchIcon",
    documentTypes: {
      project: {
        label: "project",
        iconKey: "FolderGit2Icon",
        category: "document",
      },
      issue: { label: "issue", iconKey: "CircleDotIcon", category: "issue" },
      merge_request: {
        label: "merge request",
        iconKey: "GitPullRequestIcon",
        category: "task",
      },
    },
  },

  features: [
    "Project metadata indexing",
    "Issue and merge request indexing",
    "Comment and note sync",
    "Self-hosted instance support",
    "OAuth 2.0 authentication",
    "Incremental sync via updated_after",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://gitlab.com/oauth/authorize",
      tokenUrl: "https://gitlab.com/oauth/token",
      redirectPath: "/connectors/setup/gitlab/oauth/callback",
      scopes: ["read_api", "read_user"],
    },
  },

  streams: [
    {
      name: "projects",
      label: "Projects",
      description: "Project metadata, description, and topics",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Description",
        "Default Branch",
        "Topics",
        "Visibility",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "issues",
      label: "Issues",
      description: "Issues with labels, assignees, and notes",
      entityType: "activity",
      dataPoints: ["Title", "Description", "State", "Labels", "Assignee"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "merge_requests",
      label: "Merge Requests",
      description: "Merge requests with review status and notes",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Description",
        "State",
        "Source Branch",
        "Target Branch",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "GitLab OAuth Application ID",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-gitlab-application-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "GitLab OAuth Application Secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "instance_url",
      label: "Instance URL",
      description:
        "GitLab instance URL for self-hosted. Leave empty for gitlab.com.",
      type: "text",
      required: false,
      value: "",
      placeholder: "https://gitlab.example.com",
    },
    {
      id: "include_groups",
      label: "Include Groups",
      description:
        "Comma-separated group paths to include. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "my-org, my-org/subgroup",
    },
    {
      id: "exclude_groups",
      label: "Exclude Groups",
      description: "Comma-separated group paths to exclude.",
      type: "text",
      required: false,
      value: "",
      placeholder: "my-org/archived",
    },
    {
      id: "sync_merge_requests",
      label: "Sync Merge Requests",
      description: "Index merge requests from synced projects.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_comments",
      label: "Sync Comments",
      description: "Index issue and merge request comments (notes).",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "visibility_filter",
      label: "Visibility Filter",
      description:
        "Only sync projects with this visibility (public, internal, private). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "private",
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

export default gitlabApp;
