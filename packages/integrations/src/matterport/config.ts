import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const matterportApp: UnifiedApp = {
  id: AppType.MATTERPORT,
  name: "Matterport",
  category: "Physical AI & Spatial",
  active: true,
  logo: AppType.MATTERPORT,
  short_description:
    "Index 3D spatial scans, rooms, floors, and annotations from Matterport spaces.",
  description:
    "Connect to Matterport to index 3D spatial models with room-level precision. Search across spaces, rooms, floor plans, and Mattertag annotations with spatial metadata for proximity-based retrieval.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenPlane",
  website: "https://matterport.com",

  searchDisplay: {
    defaultIconKey: "Building2Icon",
    documentTypes: {
      spatial_model: {
        label: "space",
        iconKey: "Building2Icon",
        category: "spatial_model",
      },
      spatial_room: {
        label: "room",
        iconKey: "LayoutIcon",
        category: "spatial_room",
      },
      spatial_floor: {
        label: "floor",
        iconKey: "LayersIcon",
        category: "spatial_floor",
      },
      spatial_annotation: {
        label: "tag",
        iconKey: "MapPinIcon",
        category: "spatial_annotation",
      },
    },
  },

  features: [
    "3D spatial model indexing with room-level granularity",
    "Mattertag annotation search with spatial positions",
    "Floor plan metadata extraction",
    "Spatial proximity search across buildings and rooms",
    "Incremental sync via model modification timestamps",
    "GraphQL API integration",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://support.matterport.com/s/article/Getting-Started-with-The-API",
    },
  },

  streams: [
    {
      name: "spaces",
      label: "3D Spaces",
      description:
        "Matterport 3D models with rooms, floors, and spatial metadata",
      entityType: "resource",
      dataPoints: ["Name", "Address", "Rooms", "Floors", "Area"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
    {
      name: "annotations",
      label: "Mattertags",
      description: "Spatial annotations with 3D positions and media content",
      entityType: "resource",
      dataPoints: ["Label", "Description", "Position", "Media"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_token_id",
      label: "API Token ID",
      description: "Matterport API token ID for authentication",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-api-token-id",
    },
    {
      id: "api_token_secret",
      label: "API Token Secret",
      description: "Matterport API token secret",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "model_ids",
      label: "Model IDs (optional)",
      description:
        "Specific model IDs to sync, one per line. Leave empty to sync all models.",
      type: "textarea",
      required: false,
      value: "",
      placeholder: "model-id-1\nmodel-id-2",
    },
    {
      id: "include_floor_plans",
      label: "Include Floor Plans",
      description: "Index floor plan metadata and image links",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};
