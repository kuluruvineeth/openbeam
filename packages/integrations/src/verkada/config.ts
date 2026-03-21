import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const verkadaApp: UnifiedApp = {
  id: AppType.VERKADA,
  name: "Verkada",
  category: "IoT",
  active: true,
  logo: AppType.VERKADA,
  short_description:
    "Search across cameras, access control devices, and environmental sensors.",
  description:
    "Connect Verkada to search across physical security devices including cameras, door access controllers, and environmental sensors. Supports API key authentication with polling-based sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Verkada",
  website: "https://www.verkada.com",

  searchDisplay: {
    defaultIconKey: "CpuIcon",
    documentTypes: {
      device: { label: "camera", iconKey: "CpuIcon", category: "device" },
      sensor: { label: "sensor", iconKey: "CpuIcon", category: "sensor" },
    },
  },

  features: [
    "Camera and access control device search",
    "Environmental sensor monitoring",
    "Device status and health tracking",
    "Site-based organization",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "x-verkada-auth",
      documentationUrl: "https://apidocs.verkada.com/reference/authentication",
    },
  },

  streams: [
    {
      name: "cameras",
      label: "Cameras",
      description: "Security cameras with status and configuration",
      entityType: "resource",
      dataPoints: ["Name", "Site", "Status", "Model", "Firmware"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "doors",
      label: "Access Control",
      description: "Door controllers and access points",
      entityType: "resource",
      dataPoints: ["Name", "Site", "Status", "Lock State"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "sensors",
      label: "Environmental Sensors",
      description: "Temperature, humidity, and air quality sensors",
      entityType: "resource",
      dataPoints: ["Name", "Site", "Temperature", "Humidity", "AQI"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description: "From Verkada Command > Admin > Integrations",
      type: "password",
      required: true,
      value: "",
      placeholder: "vkd_api_...",
    },
    {
      id: "org_id",
      label: "Organization ID",
      description: "Verkada organization identifier",
      type: "text",
      required: true,
      value: "",
    },
  ],
};

export default verkadaApp;
