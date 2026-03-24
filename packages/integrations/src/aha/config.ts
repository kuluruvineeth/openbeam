import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const ahaApp: UnifiedApp = {
  id: AppType.AHA,
  name: "Aha!",
  category: "Product Management",
  active: true,
  logo: AppType.AHA,
  short_description:
    "Search ideas, features, releases, initiatives, and epics from Aha!",
  description:
    "Connect Aha! to search across product management data including ideas, features, releases, initiatives, and epics. Supports API key authentication with page-based pagination and updated_since incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Aha! Labs",
  website: "https://www.aha.io",

  searchDisplay: {
    defaultIconKey: "LightbulbIcon",
    documentTypes: {
      idea: {
        label: "idea",
        iconKey: "LightbulbIcon",
        category: "task",
      },
      feature: {
        label: "feature",
        iconKey: "CheckSquareIcon",
        category: "task",
      },
      release: {
        label: "release",
        iconKey: "TagIcon",
        category: "project",
      },
      initiative: {
        label: "initiative",
        iconKey: "FlagIcon",
        category: "project",
      },
      epic: {
        label: "epic",
        iconKey: "LayersIcon",
        category: "project",
      },
    },
  },

  features: [
    "Idea search with status, category, and vote count",
    "Feature tracking with workflow status and assignments",
    "Release timeline with dates and progress",
    "Initiative and epic hierarchy navigation",
    "Incremental sync via updated_since parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://www.aha.io/api#authentication",
    },
  },

  streams: [
    {
      name: "ideas",
      label: "Ideas",
      description:
        "Product ideas with votes, status, categories, and assignees",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Category",
        "Votes",
        "Assignee",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "features",
      label: "Features",
      description:
        "Product features with workflow status, assignments, and estimates",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Assignee",
        "Due Date",
        "Release",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "releases",
      label: "Releases",
      description: "Product releases with dates, themes, and progress tracking",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Release Date",
        "Theme",
        "Status",
        "Progress",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "initiatives",
      label: "Initiatives",
      description:
        "Strategic initiatives spanning multiple releases and features",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Progress",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "epics",
      label: "Epics",
      description: "Large bodies of work grouping multiple features together",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Progress",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Aha! API key. Generate from Settings > Personal > Developer > API Key.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Aha! API key",
    },
    {
      id: "subdomain",
      label: "Subdomain",
      description: "Your Aha! subdomain (e.g., 'company' for company.aha.io)",
      type: "text",
      required: true,
      value: "",
      placeholder: "company",
    },
    {
      id: "sync_epics",
      label: "Sync Epics",
      description: "Include epics in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_initiatives",
      label: "Sync Initiatives",
      description: "Include initiatives in search results",
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
    {
      id: "product_filter",
      label: "Product Filter",
      description:
        "Comma-separated list of product IDs to sync (empty = all products)",
      type: "text",
      required: false,
      value: "",
      placeholder: "PROD-1, PROD-2",
    },
  ],
};

export default ahaApp;
