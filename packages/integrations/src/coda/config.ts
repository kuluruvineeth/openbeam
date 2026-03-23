import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const codaApp: UnifiedApp = {
  id: AppType.CODA,
  name: "Coda",
  category: "Productivity",
  active: true,
  logo: AppType.CODA,
  short_description: "Search across Coda docs, pages, tables, and rows.",
  description:
    "Connect Coda to search across documents, pages, tables, and individual rows. Supports incremental sync via the updatedSince filter on the docs endpoint.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Coda",
  website: "https://coda.io",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      document: {
        label: "document",
        iconKey: "FileTextIcon",
        category: "document",
      },
      page: {
        label: "page",
        iconKey: "FileIcon",
        category: "document",
      },
      spreadsheet: {
        label: "table",
        iconKey: "TableIcon",
        category: "document",
      },
      record: {
        label: "row",
        iconKey: "RowsIcon",
        category: "document",
      },
    },
  },

  features: [
    "Document search with full text",
    "Page content indexing",
    "Table metadata and schema",
    "Row-level record search",
    "Incremental sync via updatedSince",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://coda.io/developers/apis/v1",
    },
  },

  streams: [
    {
      name: "docs",
      label: "Documents",
      description: "Coda documents with titles, owners, and folder structure",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Title", "Owner", "Folder", "Created", "Updated"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "pages",
      label: "Pages",
      description: "Pages (sections) within Coda documents",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Title", "Content", "Parent Page", "Document"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "tables",
      label: "Tables",
      description: "Tables within Coda documents with column schemas",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Columns", "Row Count", "Document"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "rows",
      label: "Rows",
      description: "Individual rows (records) within Coda tables",
      entityType: "activity",
      isPii: false,
      dataPoints: ["Values", "Created", "Updated", "Table", "Document"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Token",
      description:
        "Generate from coda.io/account under API settings. The token owner determines data access scope.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Coda API token",
    },
    {
      id: "sync_tables",
      label: "Sync Tables",
      description: "Include table metadata in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_rows",
      label: "Sync Rows",
      description: "Include individual table rows in search results",
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
  ],
};

export default codaApp;
