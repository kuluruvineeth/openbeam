import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const pagerdutyApp: UnifiedApp = {
  id: AppType.PAGERDUTY,
  name: "PagerDuty",
  category: "Incident Management",
  active: true,
  logo: AppType.PAGERDUTY,
  short_description:
    "Search across incidents, services, and on-call schedules.",
  description:
    "Connect PagerDuty to search across incidents, services, on-call schedules, and postmortem notes. Supports incremental sync via updated_at timestamps and incident actions.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "PagerDuty",
  website: "https://www.pagerduty.com",
  searchDisplay: {
    defaultIconKey: "AlertCircleIcon",
    documentTypes: {
      incident: {
        label: "incident",
        iconKey: "AlertCircleIcon",
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
    "Incident search with status, urgency, and priority",
    "Service catalog with escalation policies",
    "On-call schedule and rotation lookup",
    "Incremental sync via updated_at timestamps",
    "Incident actions: create, acknowledge, resolve, add note",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://support.pagerduty.com/main/docs/api-access-keys",
    },
  },

  streams: [
    {
      name: "incidents",
      label: "Incidents",
      description:
        "Incidents with title, status, urgency, assignees, and timeline",
      entityType: "activity",
      dataPoints: [
        "Title",
        "Status",
        "Urgency",
        "Priority",
        "Service",
        "Assignees",
        "Created At",
        "Resolved At",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "services",
      label: "Services",
      description: "Services with escalation policies and team associations",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Escalation Policy",
        "Teams",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "schedules",
      label: "On-Call Schedules",
      description: "On-call schedules with layers, rotations, and users",
      entityType: "resource",
      dataPoints: ["Name", "Time Zone", "Users", "Schedule Layers", "Rotation"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description: "From PagerDuty > Integrations > API Access Keys",
      type: "password",
      required: true,
      value: "",
      placeholder: "u+xxxxxxxxxxxxxxxxxx",
    },
    {
      id: "sync_services",
      label: "Sync Services",
      description: "Include service catalog in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_schedules",
      label: "Sync Schedules",
      description: "Include on-call schedules in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description: "How many days of incidents to sync (default 90)",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
    {
      id: "urgency_filter",
      label: "Urgency Filter",
      description: "Comma-separated urgencies: high, low",
      type: "text",
      required: false,
      value: "",
      placeholder: "high,low",
    },
    {
      id: "status_filter",
      label: "Status Filter",
      description:
        "Comma-separated statuses: triggered, acknowledged, resolved",
      type: "text",
      required: false,
      value: "",
      placeholder: "triggered,acknowledged,resolved",
    },
    {
      id: "service_ids_filter",
      label: "Service IDs Filter",
      description: "Comma-separated service IDs to scope incidents",
      type: "text",
      required: false,
      value: "",
      placeholder: "PXXXXXX,PYYYYYY",
    },
  ],
};

export default pagerdutyApp;
