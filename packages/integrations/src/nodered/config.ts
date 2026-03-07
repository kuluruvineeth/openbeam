import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const noderedApp: UnifiedApp = {
  id: AppType.NODERED,
  name: "Node-RED",
  category: "Automation & Integration",
  active: true,
  logo: AppType.NODERED,
  short_description:
    "Index Node-RED flows, node configurations, and automation logic.",
  description:
    "Connect to Node-RED instances to index flow definitions, node configurations, and automation logic. Search across your IoT integration flows to find how data moves between systems.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenBeam",
  website: "https://nodered.org",

  searchDisplay: {
    defaultIconKey: "WorkflowIcon",
    documentTypes: {
      automation_flow: {
        label: "flow",
        iconKey: "WorkflowIcon",
        category: "automation_flow",
      },
      device_config: {
        label: "node",
        iconKey: "BoxIcon",
        category: "device_config",
      },
    },
  },

  features: [
    "Flow definition indexing with node topology",
    "Node configuration search",
    "Subflow and group metadata",
    "Flow revision tracking for incremental sync",
    "Node type catalog indexing",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://nodered.org/docs/api/admin/",
    },
  },

  streams: [
    {
      name: "flows",
      label: "Flows",
      description: "Flow definitions with node configurations",
      entityType: "resource",
      dataPoints: ["Name", "Nodes", "Connections", "Subflows"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 300,
      supportsBackfill: true,
    },
    {
      name: "settings",
      label: "Settings",
      description: "Node-RED runtime settings and palette",
      entityType: "resource",
      dataPoints: ["Version", "Palette", "Modules"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "base_url",
      label: "Node-RED URL",
      description: "Base URL of your Node-RED instance",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://nodered.example.com",
    },
    {
      id: "access_token",
      label: "Access Token",
      description: "Node-RED admin API access token",
      type: "password",
      required: true,
      value: "",
    },
  ],
};
