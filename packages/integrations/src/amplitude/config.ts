import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const amplitudeApp: UnifiedApp = {
  id: AppType.AMPLITUDE,
  name: "Amplitude",
  category: "Product Analytics",
  active: true,
  logo: AppType.AMPLITUDE,
  short_description: "Search charts, dashboards, and cohorts from Amplitude.",
  description:
    "Connect Amplitude to search across saved charts, dashboards, and user cohorts. Supports API key + secret key authentication with Basic auth encoding.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Amplitude",
  website: "https://amplitude.com",

  searchDisplay: {
    defaultIconKey: "ChartBarIcon",
    documentTypes: {
      chart: {
        label: "chart",
        iconKey: "ChartBarIcon",
        category: "document",
      },
      dashboard: {
        label: "dashboard",
        iconKey: "LayoutDashboardIcon",
        category: "document",
      },
      cohort: {
        label: "cohort",
        iconKey: "UsersIcon",
        category: "group",
      },
    },
  },

  features: [
    "Saved chart search with chart type and creator metadata",
    "Dashboard indexing with description and sharing status",
    "Cohort search with definition and user count",
    "Incremental sync via modification timestamps",
    "Basic auth with API key + secret key pair",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://www.docs.developers.amplitude.com/analytics/find-api-credentials/",
    },
  },

  streams: [
    {
      name: "charts",
      label: "Charts",
      description:
        "Saved Amplitude charts with chart type, creator, and sharing status",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Chart Type",
        "Creator",
        "Last Modified",
        "Sharing",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "dashboards",
      label: "Dashboards",
      description:
        "Amplitude dashboards with charts, description, and sharing status",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Charts",
        "Creator",
        "Last Modified",
        "Sharing",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "cohorts",
      label: "Cohorts",
      description:
        "Amplitude cohorts (user segments) with definitions and estimated size",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Definition",
        "Size",
        "Creator",
        "Last Modified",
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
        "Amplitude API Key. Found in Settings > Projects > [Project] in Amplitude.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Amplitude API Key",
    },
    {
      id: "secret_key",
      label: "Secret Key",
      description:
        "Amplitude Secret Key. Found alongside the API Key in project settings.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Amplitude Secret Key",
    },
    {
      id: "org_slug",
      label: "Organization Slug",
      description:
        "Your Amplitude organization slug (the subdomain in analytics.amplitude.com). Used to build URLs to charts and dashboards.",
      type: "text",
      required: false,
      value: "",
      placeholder: "my-org",
    },
    {
      id: "sync_cohorts",
      label: "Sync Cohorts",
      description: "Include user cohorts in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of chart/dashboard history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default amplitudeApp;
