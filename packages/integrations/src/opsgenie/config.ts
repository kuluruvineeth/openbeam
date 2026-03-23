import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const opsgenieApp: UnifiedApp = {
  id: AppType.OPSGENIE,
  name: "OpsGenie",
  category: "Incident Management",
  active: true,
  logo: AppType.OPSGENIE,
  short_description:
    "Search alerts, incidents, services, and on-call schedules from OpsGenie.",
  description:
    "Connect OpsGenie to search across alerts, incidents, services, and on-call schedules. Supports API key authentication with GenieKey header and offset-based pagination.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Atlassian",
  website: "https://www.atlassian.com/software/opsgenie",

  searchDisplay: {
    defaultIconKey: "AlertCircleIcon",
    documentTypes: {
      alert: {
        label: "alert",
        iconKey: "AlertCircleIcon",
        category: "alert",
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
      schedule: {
        label: "schedule",
        iconKey: "CalendarIcon",
        category: "schedule",
      },
    },
  },

  features: [
    "Alert search with priority and status filtering",
    "Incident tracking with responders and timelines",
    "Service catalog indexing",
    "On-call schedule and rotation visibility",
    "Incremental sync via createdAt/updatedAt sorting",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://docs.opsgenie.com/docs/api-key-management",
    },
  },

  streams: [
    {
      name: "alerts",
      label: "Alerts",
      description:
        "OpsGenie alerts with priority, status, responders, and tags",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Message",
        "Priority",
        "Status",
        "Tags",
        "Responders",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "incidents",
      label: "Incidents",
      description:
        "OpsGenie incidents with severity, status, responders, and timelines",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Message",
        "Severity",
        "Status",
        "Responders",
        "Tags",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "services",
      label: "Services",
      description: "OpsGenie service catalog with team ownership",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Team"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "schedules",
      label: "Schedules",
      description:
        "On-call schedules with rotation rules and current participants",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Timezone", "Rotations", "Team"],
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
        "OpsGenie API key (GenieKey). Generate from Settings > API key management in OpsGenie.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your OpsGenie GenieKey",
    },
    {
      id: "region",
      label: "Region",
      description: "OpsGenie instance region (US or EU)",
      type: "text",
      required: false,
      value: "us",
      placeholder: "us",
    },
    {
      id: "sync_services",
      label: "Sync Services",
      description: "Include service catalog in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_schedules",
      label: "Sync Schedules",
      description: "Include on-call schedules in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of alert/incident history to sync on first run (0 = 90 days default)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default opsgenieApp;
