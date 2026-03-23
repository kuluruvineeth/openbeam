import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const datadogApp: UnifiedApp = {
  id: AppType.DATADOG,
  name: "Datadog",
  category: "Monitoring & Observability",
  active: true,
  logo: AppType.DATADOG,
  short_description:
    "Search monitors, dashboards, incidents, services, notebooks, and SLOs from Datadog.",
  description:
    "Connect Datadog to search across monitors, dashboards, incidents, service catalog entries, notebooks, and SLOs. Supports dual API key authentication (API Key + Application Key) with multi-site support.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Datadog",
  website: "https://www.datadoghq.com",

  searchDisplay: {
    defaultIconKey: "MonitorIcon",
    documentTypes: {
      monitor: {
        label: "monitor",
        iconKey: "AlertCircleIcon",
        category: "monitor",
      },
      dashboard: {
        label: "dashboard",
        iconKey: "LayoutDashboardIcon",
        category: "dashboard",
      },
      incident: {
        label: "incident",
        iconKey: "AlertTriangleIcon",
        category: "incident",
      },
      service: {
        label: "service",
        iconKey: "ServerIcon",
        category: "service",
      },
      notebook: {
        label: "notebook",
        iconKey: "FileTextIcon",
        category: "notebook",
      },
      slo: {
        label: "SLO",
        iconKey: "TargetIcon",
        category: "slo",
      },
    },
  },

  features: [
    "Monitor search with status, priority, and tag filtering",
    "Dashboard indexing with widget descriptions",
    "Incident tracking with severity and status",
    "Service catalog with ownership and metadata",
    "Notebook content indexing",
    "SLO definitions with target and status",
    "Incremental sync via modified timestamps",
    "Multi-site support (US1, US3, US5, EU, AP1, GOV)",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "DD-API-KEY",
      documentationUrl:
        "https://docs.datadoghq.com/account_management/api-app-keys/",
    },
  },

  streams: [
    {
      name: "monitors",
      label: "Monitors",
      description:
        "Datadog monitors with status, query, tags, and alert conditions",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Name",
        "Query",
        "Status",
        "Type",
        "Tags",
        "Creator",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "dashboards",
      label: "Dashboards",
      description: "Datadog dashboards with titles, descriptions, and widgets",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "Layout",
        "Author",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "incidents",
      label: "Incidents",
      description:
        "Datadog incidents with severity, status, commander, and timeline",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Severity",
        "Status",
        "Commander",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "services",
      label: "Service Catalog",
      description:
        "Datadog service catalog entries with ownership and metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Owner", "Type", "Tags"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "notebooks",
      label: "Notebooks",
      description:
        "Datadog notebooks with cells, queries, and markdown content",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Author", "Cells", "Created", "Modified"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "slos",
      label: "SLOs",
      description:
        "Service Level Objectives with targets, thresholds, and status",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Type", "Target", "Tags"],
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
        "Datadog API key. Generate from Organization Settings > API Keys.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Datadog API key",
    },
    {
      id: "app_key",
      label: "Application Key",
      description:
        "Datadog Application key. Generate from Organization Settings > Application Keys.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Datadog Application key",
    },
    {
      id: "site",
      label: "Site",
      description:
        "Datadog site region (us1, us3, us5, eu, ap1, gov). Check your Datadog URL to determine your site.",
      type: "text",
      required: false,
      value: "us1",
      placeholder: "us1",
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
      id: "sync_incidents",
      label: "Sync Incidents",
      description: "Include incidents in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_services",
      label: "Sync Service Catalog",
      description: "Include service catalog entries in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_notebooks",
      label: "Sync Notebooks",
      description: "Include notebooks in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_slos",
      label: "Sync SLOs",
      description: "Include Service Level Objectives in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of incident history to sync on first run (0 = 90 days default)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default datadogApp;
