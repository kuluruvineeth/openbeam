import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const bitbucketApp: UnifiedApp = {
  id: AppType.BITBUCKET,
  name: "Bitbucket",
  category: "Code & Collaboration",
  active: true,
  logo: AppType.BITBUCKET,
  short_description:
    "Search across repositories, pull requests, issues, and code snippets.",
  description:
    "Connect Bitbucket Cloud to search and reason across repositories, pull requests, issues, and snippets. Supports OAuth 2.0 with workspace-level access and incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Atlassian",
  website: "https://bitbucket.org",

  searchDisplay: {
    defaultIconKey: "GitBranchIcon",
    documentTypes: {
      repository: {
        label: "repository",
        iconKey: "FolderGit2Icon",
        category: "document",
      },
      pull_request: {
        label: "pull request",
        iconKey: "GitPullRequestIcon",
        category: "task",
      },
      issue: { label: "issue", iconKey: "CircleDotIcon", category: "issue" },
      snippet: {
        label: "snippet",
        iconKey: "FileCodeIcon",
        category: "document",
      },
    },
  },

  features: [
    "Repository metadata indexing",
    "Pull request sync with comments",
    "Issue tracker sync",
    "Code snippet indexing",
    "OAuth 2.0 authentication",
    "Workspace-scoped access",
    "Incremental sync via updated_on filter",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://bitbucket.org/site/oauth2/authorize",
      tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
      redirectPath: "/connectors/setup/bitbucket/oauth/callback",
      scopes: ["repository", "pullrequest", "issue", "snippet", "account"],
    },
  },

  streams: [
    {
      name: "repositories",
      label: "Repositories",
      description: "Repository metadata, description, and settings",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Description",
        "Language",
        "Main Branch",
        "Visibility",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "pull_requests",
      label: "Pull Requests",
      description: "Pull requests with status, reviewers, and comments",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Description",
        "State",
        "Source Branch",
        "Destination Branch",
        "Reviewers",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "issues",
      label: "Issues",
      description: "Issues with priority, assignee, and status",
      entityType: "activity",
      dataPoints: ["Title", "Content", "State", "Priority", "Assignee"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "snippets",
      label: "Snippets",
      description: "Code snippets shared in the workspace",
      entityType: "resource",
      dataPoints: ["Title", "Visibility", "Owner"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "Bitbucket OAuth consumer key",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-bitbucket-consumer-key",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Bitbucket OAuth consumer secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "workspace",
      label: "Workspace",
      description: "Bitbucket workspace slug to index",
      type: "text",
      required: true,
      value: "",
      placeholder: "my-workspace",
    },
    {
      id: "sync_pull_requests",
      label: "Sync Pull Requests",
      description: "Index pull requests from repositories.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_issues",
      label: "Sync Issues",
      description:
        "Index issues from repositories with issue trackers enabled.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_snippets",
      label: "Sync Snippets",
      description: "Index code snippets from the workspace.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "include_repos",
      label: "Include Repositories",
      description:
        "Comma-separated list of repository slugs to include. Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "repo-a, repo-b",
    },
    {
      id: "exclude_repos",
      label: "Exclude Repositories",
      description: "Comma-separated list of repository slugs to exclude.",
      type: "text",
      required: false,
      value: "",
      placeholder: "archived-repo",
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

export default bitbucketApp;
