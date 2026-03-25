import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const loopioApp: UnifiedApp = {
  id: AppType.LOOPIO,
  name: "Loopio",
  category: "RFP Management",
  active: true,
  logo: AppType.LOOPIO,
  short_description:
    "Search RFP projects, library entries, and Q&A pairs from Loopio",
  description:
    "Connect Loopio to search across RFP response management data including projects, library entries, and tags. Supports API key authentication with page-based pagination and updated_after incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Loopio Inc.",
  website: "https://www.loopio.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      project: {
        label: "project",
        iconKey: "FolderIcon",
        category: "project",
      },
      library_entry: {
        label: "library entry",
        iconKey: "BookOpen01Icon",
        category: "knowledge",
      },
      tag: {
        label: "tag",
        iconKey: "TagIcon",
        category: "knowledge",
      },
    },
  },

  features: [
    "RFP project search with status, deadline, and owner tracking",
    "Library entry Q&A pairs for reusable proposal content",
    "Tag taxonomy for organized knowledge categorization",
    "Create and update library entries via actions",
    "Incremental sync via updated_after parameter",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://developers.loopio.com/",
    },
  },

  streams: [
    {
      name: "projects",
      label: "Projects",
      description:
        "RFP/RFI/DDQ projects with status, deadline, and owner information",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Status",
        "Deadline",
        "Owner",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "library_entries",
      label: "Library Entries",
      description:
        "Reusable Q&A pairs from the Loopio knowledge library for proposal responses",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Question",
        "Answer",
        "Category",
        "Tags",
        "Last Reviewed",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "tags",
      label: "Tags",
      description: "Tag taxonomy used for organizing library entries",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Entry Count"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 120,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Loopio API key. Generate from Settings > API in your Loopio account.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Loopio API key",
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Number of days of history to sync on first run (0 = all time)",
      type: "text",
      required: false,
      value: "0",
      placeholder: "0",
    },
  ],
};

export default loopioApp;
