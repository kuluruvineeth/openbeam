import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const samsaraApp: UnifiedApp = {
  id: AppType.SAMSARA,
  name: "Samsara",
  category: "Fleet Management & IoT",
  active: true,
  logo: AppType.SAMSARA,
  short_description:
    "Search across fleet vehicles, drivers, sensors, and alerts.",
  description:
    "Connect Samsara to search across fleet vehicles, GPS locations, driver activity, sensor readings, and operational alerts. Supports real-time webhooks and incremental sync via feed endpoints.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Samsara",
  website: "https://www.samsara.com",

  searchDisplay: {
    defaultIconKey: "TruckIcon",
    documentTypes: {
      device: { label: "device", iconKey: "CpuIcon", category: "device" },
      alert: {
        label: "alert",
        iconKey: "AlertCircleIcon",
        category: "alert",
      },
      device_event: {
        label: "event",
        iconKey: "ActivityIcon",
        category: "event",
      },
      sensor_reading: {
        label: "sensor",
        iconKey: "ThermometerIcon",
        category: "sensor",
      },
    },
  },

  features: [
    "Fleet vehicle and driver search",
    "GPS location and route history",
    "Sensor readings (temperature, humidity, door)",
    "Real-time alert webhooks",
    "Incremental sync via feed cursors",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://developers.samsara.com/docs/authentication",
    },
  },

  streams: [
    {
      name: "vehicles",
      label: "Vehicles",
      description: "Fleet vehicles with GPS, fuel, engine, and diagnostics",
      entityType: "resource",
      dataPoints: [
        "Name",
        "VIN",
        "GPS Location",
        "Speed",
        "Fuel Level",
        "Engine State",
        "Odometer",
      ],
      syncMode: SyncMode.REALTIME,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "drivers",
      label: "Drivers",
      description: "Fleet drivers with license and assignment info",
      entityType: "resource",
      dataPoints: ["Name", "Phone", "License", "Tags", "Status"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "alerts",
      label: "Alerts",
      description: "Operational alerts (speeding, geofence, temperature)",
      entityType: "resource",
      dataPoints: ["Type", "Severity", "Vehicle", "Driver", "Location"],
      syncMode: SyncMode.REALTIME,
      defaultInterval: 5,
      supportsBackfill: true,
    },
    {
      name: "sensors",
      label: "Sensors",
      description: "Environmental sensors (temperature, humidity, door)",
      entityType: "resource",
      dataPoints: ["Name", "Type", "Value", "Unit", "Gateway"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_token",
      label: "API Token",
      description: "From Samsara dashboard > Settings > API Tokens",
      type: "password",
      required: true,
      value: "",
      placeholder: "samsara_api_...",
    },
    {
      id: "region",
      label: "Region",
      description: "US or EU data center",
      type: "select",
      required: true,
      value: "us",
      options: [
        { label: "United States", value: "us" },
        { label: "European Union", value: "eu" },
      ],
    },
    {
      id: "sync_alerts",
      label: "Sync Alerts",
      description: "Include fleet alerts in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_sensors",
      label: "Sync Sensors",
      description: "Include environmental sensor data",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "enable_webhooks",
      label: "Real-time Updates",
      description: "Receive instant updates via Samsara webhooks",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "api_version",
      label: "API Version",
      description: "Samsara API version (date-based). Pin for stability.",
      type: "text",
      required: false,
      value: "2024-06-01",
      placeholder: "YYYY-MM-DD",
    },
  ],
};

export default samsaraApp;
