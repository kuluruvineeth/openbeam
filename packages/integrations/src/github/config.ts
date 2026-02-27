import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const githubApp: UnifiedApp = {
  id: AppType.GITHUB,
  name: "GitHub",
  category: "Code & Collaboration",
  active: true,
  logo: AppType.GITHUB,
  short_description:
    "Search across repositories, issues, pull requests, and discussions.",
  description:
    "Connect GitHub to search and reason across repositories, issues, pull requests, and release history. Supports OAuth with optional refresh token rotation and webhook-driven updates.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "GitHub, Inc.",
  website: "https://github.com",

  searchDisplay: {
    defaultIconKey: "GitBranchIcon",
    documentTypes: {
      repository: {
        label: "repository",
        iconKey: "FolderGit2Icon",
        category: "document",
      },
      issue: { label: "issue", iconKey: "CircleDotIcon", category: "issue" },
      pull_request: {
        label: "pull request",
        iconKey: "GitPullRequestIcon",
        category: "task",
      },
      discussion: {
        label: "discussion",
        iconKey: "MessageSquareIcon",
        category: "comment",
      },
      release: {
        label: "release",
        iconKey: "PackageIcon",
        category: "document",
      },
    },
  },

  features: [
    "Repository metadata and readme indexing",
    "Issue and pull request indexing",
    "Discussion and comment sync",
    "Release notes and changelog indexing",
    "OAuth 2.0 authentication",
    "Webhook-ready event model",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      redirectPath: "/connectors/setup/github/oauth/callback",
      scopes: ["read:user", "user:email", "repo", "read:org"],
    },
  },

  streams: [
    {
      name: "repositories",
      label: "Repositories",
      description: "Repository metadata, readme, and topics",
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
      description: "Issues with labels, assignees, and comments",
      entityType: "activity",
      dataPoints: ["Title", "Body", "State", "Labels", "Assignee", "Comments"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "pull_requests",
      label: "Pull Requests",
      description: "Pull requests with review status and comments",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Body",
        "State",
        "Review Status",
        "Commits",
        "Comments",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "releases",
      label: "Releases",
      description: "Release tags and notes",
      entityType: "resource",
      dataPoints: ["Tag", "Name", "Notes", "Published At", "URL"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "GitHub OAuth App client ID",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-github-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "GitHub OAuth App client secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "webhook_secret",
      label: "Webhook Secret",
      description: "Secret used to validate GitHub webhook signatures",
      type: "password",
      required: false,
      value: "",
    },
    {
      id: "include_private_repos",
      label: "Include Private Repositories",
      description: "Index private repositories available to this OAuth token.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "include_org_repos",
      label: "Include Organization Repositories",
      description:
        "Include repositories from organizations the user belongs to.",
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

export default githubApp;
