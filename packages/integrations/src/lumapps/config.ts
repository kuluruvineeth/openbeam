import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const lumappsApp: UnifiedApp = {
  id: AppType.LUMAPPS,
  name: "LumApps",
  category: "Intranet & Employee Experience",
  active: true,
  logo: AppType.LUMAPPS,
  short_description:
    "Search articles, communities, posts, and spaces from LumApps.",
  description:
    "Connect LumApps to search across intranet content including articles, news, pages, communities, posts, and spaces. Supports Bearer token authentication with cursor-based pagination.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "LumApps",
  website: "https://www.lumapps.com",

  searchDisplay: {
    defaultIconKey: "FileTextIcon",
    documentTypes: {
      content: {
        label: "content",
        iconKey: "FileTextIcon",
        category: "document",
      },
      community: {
        label: "community",
        iconKey: "UsersIcon",
        category: "knowledge",
      },
      post: {
        label: "post",
        iconKey: "MessageSquareIcon",
        category: "message",
      },
      space: {
        label: "space",
        iconKey: "FolderIcon",
        category: "knowledge",
      },
    },
  },

  features: [
    "Article and page content search with metadata filtering",
    "Community indexing with member and description details",
    "Post search across communities with author attribution",
    "Space catalog with descriptions and visibility",
    "Incremental sync via updatedAt filtering",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://apiv2.lumapps.com/docs#section/Authentication",
    },
  },

  streams: [
    {
      name: "contents",
      label: "Contents",
      description: "LumApps content items including articles, news, and pages",
      entityType: "resource",
      isPii: false,
      dataPoints: [
        "Title",
        "Body",
        "Author",
        "Status",
        "Type",
        "Tags",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "communities",
      label: "Communities",
      description:
        "LumApps communities with descriptions, privacy settings, and member counts",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Privacy", "Members", "Created"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "posts",
      label: "Posts",
      description:
        "Posts within LumApps communities with author and engagement data",
      entityType: "activity",
      isPii: false,
      dataPoints: [
        "Content",
        "Author",
        "Community",
        "Reactions",
        "Comments",
        "Created",
        "Updated",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "spaces",
      label: "Spaces",
      description: "LumApps spaces with descriptions and visibility settings",
      entityType: "resource",
      isPii: false,
      dataPoints: ["Name", "Description", "Visibility", "Created"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "api_token",
      label: "API Token",
      description:
        "LumApps API Bearer token. Generate from your LumApps admin portal under API Access.",
      type: "password",
      required: true,
      value: "",
      placeholder: "Your LumApps Bearer token",
    },
    {
      id: "base_url",
      label: "Base URL",
      description:
        "LumApps API base URL. Override only if using a custom domain.",
      type: "text",
      required: false,
      value: "https://api.lumapps.com/v2",
      placeholder: "https://api.lumapps.com/v2",
    },
    {
      id: "sync_communities",
      label: "Sync Communities",
      description: "Include communities in search results",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_posts",
      label: "Sync Posts",
      description: "Include community posts in search results",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default lumappsApp;
