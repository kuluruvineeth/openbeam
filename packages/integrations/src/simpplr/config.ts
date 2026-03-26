import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const simpplrApp: UnifiedApp = {
  id: AppType.SIMPPLR,
  name: "Simpplr",
  category: "Intranet",
  active: true,
  logo: AppType.SIMPPLR,
  short_description:
    "Search sites, pages, news, files, and people from your Simpplr intranet",
  description:
    "Connect Simpplr to search across your intranet including content sites, wiki pages, news announcements, uploaded files, and the employee directory. Supports API key authentication with offset-based pagination and modifiedAfter incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Simpplr Inc.",
  website: "https://www.simpplr.com",

  searchDisplay: {
    defaultIconKey: "GlobeIcon",
    documentTypes: {
      site: {
        label: "site",
        iconKey: "LayoutGridIcon",
        category: "project",
      },
      page: {
        label: "page",
        iconKey: "FileTextIcon",
        category: "document",
      },
      news: {
        label: "news article",
        iconKey: "NewspaperIcon",
        category: "document",
      },
      file: {
        label: "file",
        iconKey: "FileIcon",
        category: "document",
      },
      person: {
        label: "person",
        iconKey: "UserIcon",
        category: "contact",
      },
    },
  },

  features: [
    "Site and content hub browsing with metadata",
    "Wiki page search with full content indexing",
    "News and announcement search with publication dates",
    "File library indexing with file metadata",
    "Employee directory search with profiles and departments",
    "Incremental sync via modifiedAfter filtering",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://developer.simpplr.com/",
    },
  },

  streams: [
    {
      name: "sites",
      label: "Sites",
      description: "Content hubs and community sites",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Type",
        "Status",
        "Member Count",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "pages",
      label: "Pages",
      description:
        "Intranet content pages and wiki articles with titles, body, and metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Site",
        "Status",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "news",
      label: "News",
      description: "Company news and announcements with publication details",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Category",
        "Published Date",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "files",
      label: "Files",
      description: "Uploaded files and documents with metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Description",
        "File Type",
        "Author",
        "Size",
        "Created",
        "Modified",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "people",
      label: "People",
      description: "Employee profiles from the Simpplr people directory",
      entityType: "activity",
      isPii: true,
      dataPoints: [
        "Name",
        "Email",
        "Title",
        "Department",
        "Location",
        "Phone",
        "Bio",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Key",
      description:
        "Simpplr API key. Generate from your Simpplr admin panel under API settings.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Simpplr API key",
    },
    {
      id: "instance",
      label: "Instance",
      description:
        "Your Simpplr instance name (e.g., 'company' for company.simpplr.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "company",
    },
    {
      id: "sync_files",
      label: "Sync Files",
      description: "Include uploaded files in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_people",
      label: "Sync People",
      description: "Include employee profiles in search results",
      type: "switch",
      required: false,
      value: true,
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

export default simpplrApp;
