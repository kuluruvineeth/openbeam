import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const thingsboardApp: UnifiedApp = {
  id: AppType.THINGSBOARD,
  name: "ThingsBoard",
  category: "IoT Platform",
  active: true,
  logo: AppType.THINGSBOARD,
  short_description:
    "Index ThingsBoard devices, telemetry, dashboards, and rule engine alerts.",
  description:
    "Connect to ThingsBoard IoT platform to search across devices, telemetry data, dashboards, alarm rules, and customer configurations. Supports both Community and Professional editions via REST API.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenBeam",
  website: "https://thingsboard.io",

  searchDisplay: {
    defaultIconKey: "LayoutDashboardIcon",
    documentTypes: {
      device: { label: "device", iconKey: "CpuIcon", category: "device" },
      sensor_reading: {
        label: "telemetry",
        iconKey: "ThermometerIcon",
        category: "sensor_reading",
      },
      alarm: {
        label: "alarm",
        iconKey: "AlertCircleIcon",
        category: "alert",
      },
      device_config: {
        label: "dashboard",
        iconKey: "LayoutDashboardIcon",
        category: "device_config",
      },
    },
  },

  features: [
    "Device and asset inventory search",
    "Telemetry time-series data indexing",
    "Alarm and rule engine event tracking",
    "Dashboard metadata indexing",
    "Incremental sync via server-side timestamps",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "X-Authorization",
      documentationUrl: "https://thingsboard.io/docs/reference/rest-api/",
    },
  },

  streams: [
    {
      name: "devices",
      label: "Devices",
      description: "Device inventory with attributes and telemetry keys",
      entityType: "resource",
      dataPoints: ["Name", "Type", "Label", "Active"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 300,
      supportsBackfill: true,
    },
    {
      name: "telemetry",
      label: "Telemetry",
      description: "Device telemetry time-series data",
      entityType: "resource",
      dataPoints: ["Key", "Value", "Timestamp"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "alarms",
      label: "Alarms",
      description: "Active and acknowledged alarms",
      entityType: "activity",
      dataPoints: ["Type", "Severity", "Status", "Originator"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "base_url",
      label: "ThingsBoard URL",
      description: "Base URL of your ThingsBoard instance",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://thingsboard.example.com",
    },
    {
      id: "username",
      label: "Username",
      description: "ThingsBoard tenant administrator email",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "password",
      label: "Password",
      description: "ThingsBoard tenant administrator password",
      type: "password",
      required: true,
      value: "",
    },
  ],
};
