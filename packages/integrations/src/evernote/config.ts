import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const evernoteApp: UnifiedApp = {
  id: AppType.EVERNOTE,
  name: "Evernote",
  category: "Productivity",
  active: true,
  logo: AppType.EVERNOTE,
  short_description: "Search across Evernote notes, notebooks, and tags.",
  description:
    "Connect Evernote to search across notes with full ENML-to-text conversion, notebooks, and tags. Supports incremental sync via update sequence numbers (USN).",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Evernote",
  website: "https://evernote.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      document: {
        label: "note",
        iconKey: "FileTextIcon",
        category: "document",
      },
      folder: {
        label: "notebook",
        iconKey: "FolderIcon",
        category: "document",
      },
      tag: {
        label: "tag",
        iconKey: "TagIcon",
        category: "document",
      },
    },
  },

  features: [
    "Note search with ENML-to-text extraction",
    "Notebook metadata indexing",
    "Tag-based organization",
    "Incremental sync via update sequence numbers",
    "Note creation, update, and deletion",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://dev.evernote.com/doc/",
    },
  },

  streams: [
    {
      name: "notes",
      label: "Notes",
      description: "Evernote notes with title, content, tags, and notebook",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Tags",
        "Notebook",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "notebooks",
      label: "Notebooks",
      description: "Evernote notebooks with name and stack grouping",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Stack", "Default", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "developer_token",
      label: "Developer Token",
      description:
        "Generate from dev.evernote.com. The token determines data access scope.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Evernote developer token",
    },
    {
      id: "environment",
      label: "Environment",
      description: "Use sandbox for testing, production for real data",
      type: "select",
      required: false,
      value: "production",
      options: [
        { label: "Production", value: "production" },
        { label: "Sandbox", value: "sandbox" },
      ],
    },
    {
      id: "sync_tags",
      label: "Sync Tags",
      description: "Include tag entities in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description: "Number of days of history to sync on first run (0 = all)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
    {
      id: "notebook_filter",
      label: "Notebook Filter",
      description: "Comma-separated notebook names to sync (empty = all)",
      type: "text",
      required: false,
      value: "",
      placeholder: "Work, Research, Personal",
    },
  ],
};

export default evernoteApp;
