import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const mindtouchApp: UnifiedApp = {
  id: AppType.MINDTOUCH,
  name: "Mindtouch",
  category: "Knowledge Management",
  active: true,
  logo: AppType.MINDTOUCH,
  short_description:
    "Search knowledge base articles, categories, and tags from Mindtouch",
  description:
    "Connect Mindtouch (NICE CXone Expert) to search across knowledge base pages, categories, and tags. Supports API key authentication with page-based pagination and timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "NICE",
  website: "https://www.mindtouch.com",

  searchDisplay: {
    defaultIconKey: "BookOpenIcon",
    documentTypes: {
      page: {
        label: "page",
        iconKey: "FileTextIcon",
        category: "document",
      },
      category: {
        label: "category",
        iconKey: "FolderIcon",
        category: "project",
      },
      tag: {
        label: "tag",
        iconKey: "TagIcon",
        category: "project",
      },
    },
  },

  features: [
    "Knowledge base page search with full HTML content extraction",
    "Category hierarchy navigation and taxonomy browsing",
    "Tag-based filtering across knowledge base articles",
    "Incremental sync via page revision timestamps",
    "Subdomain-specific instance URL configuration",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://success.mindtouch.com/Integrations/API/Authorization",
    },
  },

  streams: [
    {
      name: "pages",
      label: "Pages",
      description:
        "Knowledge base articles and documentation pages with HTML content",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Title",
        "Content",
        "Path",
        "Tags",
        "Author",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "categories",
      label: "Categories",
      description: "Taxonomy categories organizing knowledge base content",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Title", "Path", "Parent", "Page Count", "Created"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "tags",
      label: "Tags",
      description: "Content tags used across knowledge base pages",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Page Count", "Type"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_key",
      label: "API Token",
      description:
        "Mindtouch API token. Generate from Control Panel > Integrations > API Keys.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your Mindtouch API token",
    },
    {
      id: "instance_url",
      label: "Instance URL",
      description:
        "Your Mindtouch instance URL (e.g., 'https://company.mindtouch.us' or 'https://docs.company.com')",
      type: "text",
      required: true,
      value: "",
      placeholder: "https://company.mindtouch.us",
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

export default mindtouchApp;
