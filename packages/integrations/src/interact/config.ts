import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const interactApp: UnifiedApp = {
  id: AppType.INTERACT,
  name: "Interact",
  category: "Intranet",
  active: true,
  logo: AppType.INTERACT,
  short_description:
    "Search pages, news, documents, people, and spaces from your Interact intranet",
  description:
    "Connect Interact to search across your intranet including content pages, news articles, documents, employee profiles, and community spaces. Supports API key authentication with offset-based pagination and ModifiedDate incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Interact Software",
  website: "https://www.interactsoftware.com",

  searchDisplay: {
    defaultIconKey: "GlobeIcon",
    documentTypes: {
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
      document: {
        label: "document",
        iconKey: "FileIcon",
        category: "document",
      },
      person: {
        label: "person",
        iconKey: "UserIcon",
        category: "contact",
      },
      space: {
        label: "space",
        iconKey: "UsersIcon",
        category: "project",
      },
    },
  },

  features: [
    "Intranet page search with full content indexing",
    "News article search with publication dates and authors",
    "Document library indexing with file metadata",
    "Employee directory search with profiles and departments",
    "Community space and team browsing",
    "Incremental sync via ModifiedDate filtering",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://developer.interactsoftware.com/",
    },
  },

  streams: [
    {
      name: "pages",
      label: "Pages",
      description:
        "Intranet content pages with titles, body content, and metadata",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Author",
        "Section",
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
      label: "News Articles",
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
      name: "documents",
      label: "Documents",
      description: "Document library files with metadata and descriptions",
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
      description: "Employee profiles from the Interact people directory",
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
    {
      name: "spaces",
      label: "Spaces",
      description: "Community spaces, teams, and groups",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Name",
        "Description",
        "Type",
        "Member Count",
        "Created",
        "Modified",
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
        "Interact API key. Generate from your Interact admin panel under API settings.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Interact API key",
    },
    {
      id: "instance",
      label: "Instance",
      description:
        "Your Interact instance name (e.g., 'company' for company.interactsoftware.com)",
      type: "text",
      required: true,
      value: "",
      placeholder: "company",
    },
    {
      id: "sync_documents",
      label: "Sync Documents",
      description: "Include document library files in search results",
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
      id: "sync_spaces",
      label: "Sync Spaces",
      description: "Include community spaces in search results",
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

export default interactApp;
