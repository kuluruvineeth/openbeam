import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const azureIotApp: UnifiedApp = {
  id: AppType.AZURE_IOT,
  name: "Azure IoT Hub",
  category: "IoT",
  active: true,
  logo: AppType.AZURE_IOT,
  short_description:
    "Search across IoT devices, device twins, and device groups.",
  description:
    "Connect Azure IoT Hub to search across registered devices, device twins with reported and desired state, and tag-based device groups. Uses the IoT Hub Query API with SQL-like syntax for efficient syncing.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Microsoft",
  website: "https://azure.microsoft.com/en-us/products/iot-hub",

  searchDisplay: {
    defaultIconKey: "CpuIcon",
    documentTypes: {
      device: { label: "device", iconKey: "CpuIcon", category: "device" },
    },
  },

  features: [
    "Device registry search",
    "Device twin state inspection (reported + desired)",
    "Tag-based device grouping",
    "Connection state monitoring",
    "SQL-like query language for filtering",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://learn.microsoft.com/en-us/azure/iot-hub/authenticate-authorize-sas",
    },
  },

  streams: [
    {
      name: "devices",
      label: "Devices",
      description: "IoT devices with twin state, tags, and connection status",
      entityType: "resource",
      dataPoints: [
        "Device ID",
        "Connection State",
        "Status",
        "Twin Tags",
        "Reported Properties",
        "Desired Properties",
        "Last Activity",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "connection_string",
      label: "IoT Hub Connection String",
      description:
        "From Azure Portal > IoT Hub > Shared access policies > registryRead or iothubowner",
      type: "password",
      required: true,
      value: "",
      placeholder:
        "HostName=myhub.azure-devices.net;SharedAccessKeyName=...;SharedAccessKey=...",
    },
  ],
};

export default azureIotApp;
