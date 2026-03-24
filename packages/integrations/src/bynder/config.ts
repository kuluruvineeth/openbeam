import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const bynderApp: UnifiedApp = {
  id: AppType.BYNDER,
  name: "Bynder",
  category: "Digital Asset Management",
  active: true,
  logo: AppType.BYNDER,
  short_description:
    "Search across digital assets, collections, and tags in Bynder.",
  description:
    "Connect Bynder to search across digital assets (images, videos, documents), collections, and tags. Supports OAuth 2.0 with dateModified-based incremental sync for efficient change detection.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Bynder B.V.",
  website: "https://www.bynder.com",

  searchDisplay: {
    defaultIconKey: "Image",
    documentTypes: {
      asset: { label: "asset", iconKey: "Image", category: "image" },
      image: { label: "image", iconKey: "Image", category: "image" },
      video: { label: "video", iconKey: "Video", category: "file" },
      document: {
        label: "document",
        iconKey: "FileText",
        category: "document",
      },
      collection: {
        label: "collection",
        iconKey: "Folder",
        category: "folder",
      },
      tag: { label: "tag", iconKey: "Tags", category: "unknown" },
    },
  },

  features: [
    "Search across all Bynder digital assets",
    "Collection and tag indexing",
    "dateModified-based incremental sync",
    "Asset metadata and property extraction",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://DOMAIN.bynder.com/v6/authentication/oauth2/auth",
      tokenUrl: "https://DOMAIN.bynder.com/v6/authentication/oauth2/token",
      redirectPath: "/connectors/setup/bynder/oauth/callback",
      scopes: ["offline", "asset:read", "collection:read"],
    },
  },

  streams: [
    {
      name: "assets",
      label: "Assets",
      description:
        "Digital assets stored in Bynder (images, videos, documents)",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Type",
        "Description",
        "Tags",
        "DateModified",
        "DateCreated",
      ],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "collections",
      label: "Collections",
      description: "Asset collections organized in Bynder",
      entityType: "resource",
      dataPoints: ["Name", "Description", "AssetCount", "DateModified"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "tags",
      label: "Tags",
      description: "Tags used to categorize assets",
      entityType: "resource",
      dataPoints: ["Name", "MediaCount"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Bynder app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "domain",
      label: "Bynder Domain",
      description: "Your Bynder subdomain (e.g., 'acme' for acme.bynder.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "acme",
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From the Bynder Portal Settings > OAuth Apps",
      type: "text",
      required: true,
      value: "",
      placeholder: "your-client-id",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From the Bynder Portal Settings > OAuth Apps",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "sync_collections",
      label: "Sync Collections",
      description: "Index asset collections alongside assets",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_tags",
      label: "Sync Tags",
      description: "Index tags used to categorize assets",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default bynderApp;
