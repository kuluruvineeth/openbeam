import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const omniverseApp: UnifiedApp = {
  id: AppType.OMNIVERSE,
  name: "NVIDIA Omniverse",
  category: "Physical AI & Spatial",
  active: true,
  logo: AppType.OMNIVERSE,
  short_description:
    "Index digital twin data from NVIDIA Omniverse USD scenes and Nucleus.",
  description:
    "Connect to NVIDIA Omniverse to index industrial digital twin data from OpenUSD scenes. Search across equipment, zones, sensors, and annotations with full spatial metadata. Supports USD Search API for natural language queries, Nucleus file watch for incremental sync, and spatial bounds filtering.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenBeam",
  website: "https://www.nvidia.com/en-us/omniverse/",

  searchDisplay: {
    defaultIconKey: "ServerIcon",
    documentTypes: {
      digital_twin_asset: {
        label: "asset",
        iconKey: "ServerIcon",
        category: "digital_twin_asset",
      },
      digital_twin_zone: {
        label: "zone",
        iconKey: "LayoutIcon",
        category: "digital_twin_zone",
      },
      digital_twin_sensor: {
        label: "sensor",
        iconKey: "ThermometerIcon",
        category: "digital_twin_sensor",
      },
      digital_twin_annotation: {
        label: "note",
        iconKey: "StickyNoteIcon",
        category: "digital_twin_annotation",
      },
    },
  },

  features: [
    "OpenUSD scene graph traversal and indexing",
    "USD Search API integration for natural language queries",
    "Nucleus file system watch for incremental sync",
    "Spatial metadata extraction (transforms, bounds, positions)",
    "Scene hierarchy preservation with parent-child relationships",
    "Equipment, zone, sensor, and annotation document types",
    "Prim type filtering and depth limiting",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://docs.omniverse.nvidia.com/nucleus/latest/config-and-info/api_tokens.html",
    },
  },

  streams: [
    {
      name: "digital_twins",
      label: "Digital Twin Assets",
      description: "Equipment, zones, sensors, and annotations from USD scenes",
      entityType: "resource",
      dataPoints: ["Name", "Type", "Position", "Properties", "Hierarchy"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
    {
      name: "twin_state",
      label: "Twin State Changes",
      description: "Real-time state changes from digital twin simulations",
      entityType: "activity",
      dataPoints: ["Node", "Property", "Value", "Timestamp"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 60,
      supportsBackfill: false,
    },
  ],

  settings: [
    {
      id: "nucleus_url",
      label: "Nucleus Server URL",
      description: "Omniverse Nucleus server URL",
      type: "text",
      required: true,
      value: "",
      placeholder: "omniverse://nucleus.example.com",
    },
    {
      id: "api_token",
      label: "API Token",
      description: "Omniverse API token for Nucleus and USD Search API access",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "stage_paths",
      label: "USD Stage Paths",
      description: "Paths to USD stages to index, one per line",
      type: "textarea",
      required: true,
      value: "",
      placeholder: "/Projects/Factory/main.usd\n/Projects/Warehouse/scene.usd",
    },
    {
      id: "usd_search_url",
      label: "USD Search API URL (optional)",
      description:
        "URL of the USD Search API service for natural language search",
      type: "text",
      required: false,
      value: "",
      placeholder: "https://usd-search.example.com",
    },
    {
      id: "depth_limit",
      label: "Scene Depth Limit",
      description: "Maximum depth for scene graph traversal (0 for unlimited)",
      type: "number",
      required: false,
      value: 0,
    },
  ],
};
