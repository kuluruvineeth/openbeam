import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const smartThingsApp: UnifiedApp = {
  id: AppType.SMARTTHINGS,
  name: "SmartThings",
  category: "IoT",
  active: true,
  logo: AppType.SMARTTHINGS,
  short_description:
    "Search across SmartThings devices, locations, and scenes.",
  description:
    "Connect Samsung SmartThings to search across IoT devices, locations, rooms, and automation scenes. Supports device capabilities, health status, and component details.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Samsung",
  website: "https://www.smartthings.com",

  searchDisplay: {
    defaultIconKey: "CpuIcon",
    documentTypes: {
      device: { label: "device", iconKey: "CpuIcon", category: "device" },
      location: {
        label: "location",
        iconKey: "MapPinIcon",
        category: "location",
      },
      scene: {
        label: "scene",
        iconKey: "PlayIcon",
        category: "automation",
      },
    },
  },

  features: [
    "IoT device search with capabilities",
    "Device health and status monitoring",
    "Location and room organization",
    "Automation scene discovery",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://developer.smartthings.com/docs/getting-started/authorization-and-permissions",
    },
  },

  streams: [
    {
      name: "devices",
      label: "Devices",
      description: "IoT devices with capabilities, components, and health",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Type",
        "Capabilities",
        "Health",
        "Location",
        "Room",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "locations",
      label: "Locations",
      description: "Physical locations and rooms",
      entityType: "resource",
      dataPoints: ["Name", "Timezone", "Country", "Temperature Scale"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "scenes",
      label: "Scenes",
      description: "Automation scenes",
      entityType: "resource",
      dataPoints: ["Name", "Location", "Last Executed"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "access_token",
      label: "Personal Access Token",
      description: "From SmartThings developer portal > Personal Access Tokens",
      type: "password",
      required: true,
      value: "",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      id: "sync_scenes",
      label: "Sync Scenes",
      description: "Include automation scenes in search",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default smartThingsApp;
