import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const smartsheetApp: UnifiedApp = {
  id: AppType.SMARTSHEET,
  name: "Smartsheet",
  category: "Project Management",
  active: true,
  logo: AppType.SMARTSHEET,
  short_description:
    "Search sheets, rows, workspaces, reports, and dashboards from Smartsheet",
  description:
    "Connect Smartsheet to search across work management data including sheets with rows, workspaces, reports, and dashboards. Supports API key authentication with page-based pagination and modifiedSince incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Smartsheet Inc.",
  website: "https://www.smartsheet.com",

  searchDisplay: {
    defaultIconKey: "TableIcon",
    documentTypes: {
      sheet: {
        label: "sheet",
        iconKey: "TableIcon",
        category: "document",
      },
      row: {
        label: "row",
        iconKey: "ListIcon",
        category: "task",
      },
      workspace: {
        label: "workspace",
        iconKey: "FolderIcon",
        category: "project",
      },
      report: {
        label: "report",
        iconKey: "BarChartIcon",
        category: "document",
      },
      dashboard: {
        label: "dashboard",
        iconKey: "LayoutGridIcon",
        category: "document",
      },
    },
  },

  features: [
    "Sheet search with column definitions and row data",
    "Row-level indexing with cell values and metadata",
    "Workspace hierarchy navigation",
    "Report and dashboard discovery",
    "Incremental sync via modifiedSince parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://smartsheet.redoc.ly/#section/API-Basics/Raw-Token-Requests",
    },
  },

  streams: [
    {
      name: "sheets",
      label: "Sheets",
      description:
        "Smartsheet sheets with column definitions, metadata, and row content",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Columns",
        "Row Count",
        "Owner",
        "Created",
        "Modified",
        "Permalink",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "rows",
      label: "Rows",
      description: "Individual rows within sheets with cell values and status",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Cell Values",
        "Row Number",
        "Parent Row",
        "Created",
        "Modified",
        "Locked",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "workspaces",
      label: "Workspaces",
      description: "Workspaces containing sheets, reports, and dashboards",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Permalink", "Sheets", "Reports", "Dashboards"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "reports",
      label: "Reports",
      description: "Smartsheet reports aggregating data across sheets",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Source Sheets", "Owner", "Created", "Modified"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "dashboards",
      label: "Dashboards",
      description: "Visual dashboards with widgets and data summaries",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Widgets", "Owner", "Created", "Modified"],
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
        "Smartsheet API access token. Generate from Account > Personal Settings > API Access.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Smartsheet API access token",
    },
    {
      id: "sync_reports",
      label: "Sync Reports",
      description: "Include reports in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_dashboards",
      label: "Sync Dashboards",
      description: "Include dashboards in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_workspaces",
      label: "Sync Workspaces",
      description: "Include workspaces in search results",
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

export default smartsheetApp;
