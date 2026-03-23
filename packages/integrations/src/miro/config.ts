import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const miroApp: UnifiedApp = {
  id: AppType.MIRO,
  name: "Miro",
  category: "Design & Collaboration",
  active: true,
  logo: AppType.MIRO,
  short_description:
    "Search across boards, sticky notes, shapes, text, cards, and frames.",
  description:
    "Connect Miro to search across collaborative whiteboard content including boards, sticky notes, shapes, text, cards, and frames. Supports OAuth 2.0 with timestamp-based incremental sync.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Miro",
  website: "https://miro.com",

  searchDisplay: {
    defaultIconKey: "LayoutDashboard",
    documentTypes: {
      document: {
        label: "board",
        iconKey: "LayoutDashboard",
        category: "document",
      },
      page: { label: "item", iconKey: "StickyNote", category: "page" },
    },
  },

  features: [
    "Semantic search across boards, sticky notes, shapes, text, cards, and frames",
    "Incremental sync via board modifiedAt timestamp filtering",
    "OAuth 2.0 authentication with automatic token refresh",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://miro.com/oauth/authorize",
      tokenUrl: "https://api.miro.com/v1/oauth/token",
      redirectPath: "/connectors/setup/miro/oauth/callback",
      scopes: ["boards:read", "boards:write"],
    },
  },

  streams: [
    {
      name: "boards",
      label: "Boards",
      description: "Collaborative whiteboards",
      entityType: "activity",
      dataPoints: ["Name", "Description", "Owner", "CreatedAt", "ModifiedAt"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
    {
      name: "items",
      label: "Items",
      description:
        "Board items including sticky notes, shapes, text, cards, and frames",
      entityType: "activity",
      dataPoints: ["Type", "Content", "Board", "CreatedBy", "ModifiedAt"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Enter Miro OAuth app credentials.",
      type: "select",
      required: true,
      value: "manual",
      options: [{ label: "Enter manually", value: "manual" }],
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Miro developer app settings",
      type: "text",
      required: true,
      value: "",
      placeholder: "abc123...",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Miro developer app settings",
      type: "password",
      required: true,
      value: "",
    },
    {
      id: "include_boards",
      label: "Include Boards",
      description:
        "Comma-separated board IDs to sync. Leave empty for all boards.",
      type: "text",
      required: false,
      value: "",
      placeholder: "board1, board2",
    },
    {
      id: "exclude_boards",
      label: "Exclude Boards",
      description: "Comma-separated board IDs to exclude from sync.",
      type: "text",
      required: false,
      value: "",
      placeholder: "board3, board4",
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync. Leave empty for unlimited.",
      type: "text",
      required: false,
      value: "",
      placeholder: "Unlimited",
    },
  ],
};

export default miroApp;
