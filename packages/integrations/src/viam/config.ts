import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const viamApp: UnifiedApp = {
  id: AppType.VIAM,
  name: "Viam Robotics",
  category: "Physical AI & Spatial",
  active: true,
  logo: AppType.VIAM,
  short_description:
    "Index robot fleet data, sensor readings, and ML models from Viam.",
  description:
    "Connect to Viam to index robot fleet telemetry, component configurations, sensor data, camera captures, and ML models. Supports fleet-wide search across machines, locations, and aggregated sensor data with time-windowed summaries.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenPlane",
  website: "https://www.viam.com",

  searchDisplay: {
    defaultIconKey: "BotIcon",
    documentTypes: {
      robot_machine: {
        label: "robot",
        iconKey: "BotIcon",
        category: "robot_machine",
      },
      robot_component: {
        label: "component",
        iconKey: "CpuIcon",
        category: "robot_component",
      },
      robot_sensor_data: {
        label: "sensor",
        iconKey: "ThermometerIcon",
        category: "robot_sensor_data",
      },
      robot_capture: {
        label: "capture",
        iconKey: "CameraIcon",
        category: "robot_capture",
      },
    },
  },

  features: [
    "Robot fleet discovery across locations and organizations",
    "Component-level configuration indexing (sensors, cameras, motors, arms)",
    "Time-windowed sensor data aggregation (5-min averages)",
    "Camera capture metadata with ML annotation tags",
    "Action log indexing for command audit trails",
    "ML model registry search",
    "Incremental sync via data client timestamps",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://docs.viam.com/",
    },
  },

  streams: [
    {
      name: "fleet",
      label: "Robot Fleet",
      description:
        "Machines, components, and locations across the organization",
      entityType: "resource",
      dataPoints: ["Name", "Status", "Components", "Location"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 300,
      supportsBackfill: true,
    },
    {
      name: "telemetry",
      label: "Sensor Telemetry",
      description: "Aggregated sensor readings with time-windowed summaries",
      entityType: "resource",
      dataPoints: ["Component", "Value", "Min", "Max", "Average"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 300,
      supportsBackfill: true,
    },
    {
      name: "captures",
      label: "Camera Captures",
      description: "Image captures with ML annotations and tags",
      entityType: "activity",
      dataPoints: ["Camera", "Tags", "Annotations", "Timestamp"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 600,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description: "Viam organization API key",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "api_key_id",
      label: "API Key ID",
      description: "Viam API key identifier",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "organization_id",
      label: "Organization ID",
      description: "Viam organization identifier",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "sensor_lookback_hours",
      label: "Sensor Data Lookback (hours)",
      description: "Hours of historical sensor data to sync",
      type: "number",
      required: false,
      value: 24,
    },
    {
      id: "sync_ml_models",
      label: "Sync ML Models",
      description: "Index ML model registry metadata",
      type: "switch",
      required: false,
      value: false,
    },
  ],
};
