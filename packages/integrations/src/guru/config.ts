import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const guruApp: UnifiedApp = {
  id: AppType.GURU,
  name: "Guru",
  category: "Knowledge Management",
  active: true,
  logo: AppType.GURU,
  short_description: "Search across knowledge cards, collections, and folders.",
  description:
    "Connect Guru to search across verified knowledge cards, collections, and folders. Supports incremental sync via lastModified timestamps and card create/update actions.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Guru",
  website: "https://www.getguru.com",
  searchDisplay: {
    defaultIconKey: "BookOpenIcon",
    documentTypes: {
      card: {
        label: "card",
        iconKey: "FileTextIcon",
        category: "knowledge",
      },
      collection: {
        label: "collection",
        iconKey: "FolderIcon",
        category: "folder",
      },
      folder: {
        label: "folder",
        iconKey: "FolderIcon",
        category: "folder",
      },
    },
  },

  features: [
    "Knowledge card search with verification status",
    "Collection and folder browsing",
    "Incremental sync via lastModified timestamps",
    "Card actions: create and update",
    "Verified-only sync filter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://developer.getguru.com/reference/authentication",
    },
  },

  streams: [
    {
      name: "cards",
      label: "Cards",
      description:
        "Knowledge cards with title, content, verification status, and tags",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Collection",
        "Tags",
        "Verification State",
        "Owner",
        "Last Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "collections",
      label: "Collections",
      description: "Collections that organize cards into groups",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Color", "Card Count"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "folders",
      label: "Folders",
      description: "Folders within collections for hierarchical organization",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Title", "Collection", "Item Count"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "email",
      label: "Email",
      description: "Your Guru account email address",
      type: "text",
      required: true,
      value: "",
      placeholder: "user@company.com",
    },
    {
      id: "api_token",
      label: "API Token",
      description: "User API token from Guru settings",
      type: "password",
      required: true,
      value: "",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      id: "sync_collections",
      label: "Sync Collections",
      description: "Include collections in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_folders",
      label: "Sync Folders",
      description: "Include folders in search",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "verified_only",
      label: "Verified Only",
      description: "Only sync cards with verified status",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "include_collections",
      label: "Include Collections",
      description: "Comma-separated collection names to include (empty = all)",
      type: "text",
      required: false,
      value: "",
      placeholder: "Engineering, Product",
    },
    {
      id: "exclude_collections",
      label: "Exclude Collections",
      description: "Comma-separated collection names to exclude",
      type: "text",
      required: false,
      value: "",
      placeholder: "Archive, Deprecated",
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description: "How many days of cards to sync (default 365)",
      type: "text",
      required: false,
      value: "365",
      placeholder: "365",
    },
  ],
};

export default guruApp;
