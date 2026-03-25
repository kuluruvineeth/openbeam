import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const phabricatorApp: UnifiedApp = {
  id: AppType.PHABRICATOR,
  name: "Phabricator",
  category: "Development",
  active: true,
  logo: AppType.PHABRICATOR,
  short_description:
    "Search tasks, code reviews, wiki pages, repositories, and projects from Phabricator",
  description:
    "Connect Phabricator to search across development data including Maniphest tasks, Differential code reviews, Phriction wiki pages, Diffusion repositories, and projects. Supports API token authentication with cursor-based pagination and dateModified incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Phacility",
  website: "https://www.phacility.com/phabricator",

  searchDisplay: {
    defaultIconKey: "CodeIcon",
    documentTypes: {
      task: {
        label: "task",
        iconKey: "CheckSquareIcon",
        category: "task",
      },
      revision: {
        label: "code review",
        iconKey: "GitMergeIcon",
        category: "pull_request",
      },
      wiki_page: {
        label: "wiki page",
        iconKey: "FileTextIcon",
        category: "wiki",
      },
      repository: {
        label: "repository",
        iconKey: "GitBranchIcon",
        category: "repository",
      },
      project: {
        label: "project",
        iconKey: "FolderIcon",
        category: "project",
      },
    },
  },

  features: [
    "Maniphest task search with status, priority, and assignee",
    "Differential code review indexing with diffs and reviewers",
    "Phriction wiki page full-text search",
    "Diffusion repository metadata and descriptions",
    "Project hierarchy and membership",
    "Incremental sync via dateModified constraint",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "api.token",
      documentationUrl:
        "https://secure.phabricator.com/book/phabricator/article/conduit/",
    },
  },

  streams: [
    {
      name: "tasks",
      label: "Tasks (Maniphest)",
      description:
        "Maniphest tasks with status, priority, assignee, and descriptions",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "Status",
        "Priority",
        "Assignee",
        "Projects",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "revisions",
      label: "Code Reviews (Differential)",
      description:
        "Differential code reviews with status, reviewers, and summary",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Summary",
        "Status",
        "Author",
        "Reviewers",
        "Repository",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "wiki_pages",
      label: "Wiki Pages (Phriction)",
      description: "Phriction wiki pages with content and edit history",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Path",
        "Author",
        "Status",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "repositories",
      label: "Repositories (Diffusion)",
      description: "Diffusion repositories with names, URIs, and descriptions",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Callsign",
        "VCS",
        "Description",
        "Status",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "projects",
      label: "Projects",
      description: "Projects with members, milestones, and descriptions",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Color",
        "Icon",
        "Members",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_token",
      label: "API Token",
      description:
        "Phabricator Conduit API token. Generate from Settings > Conduit API Tokens.",
      type: "password",
      required: true,
      value: "",
      placeholder: "api-xxxxxxxxxxxxxxxxx",
    },
    {
      id: "instance_url",
      label: "Instance URL",
      description:
        "Your Phabricator instance URL (e.g., https://phabricator.example.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://phabricator.example.com",
    },
    {
      id: "sync_wiki_pages",
      label: "Sync Wiki Pages",
      description: "Include Phriction wiki pages in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_repositories",
      label: "Sync Repositories",
      description: "Include Diffusion repositories in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_projects",
      label: "Sync Projects",
      description: "Include projects in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default phabricatorApp;
