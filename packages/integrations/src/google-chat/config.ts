import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const googleChatApp: UnifiedApp = {
  id: AppType.GOOGLE_CHAT,
  name: "Google Chat",
  category: "Communication",
  active: true,
  logo: AppType.GOOGLE_CHAT,
  short_description: "Search across chat spaces, messages, and threads.",
  description:
    "Connect Google Chat to search across spaces, messages, and threads. Supports OAuth for Google Workspace accounts.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Google LLC",
  website: "https://chat.google.com",

  searchDisplay: {
    defaultIconKey: "MessageSquare",
    documentTypes: {
      space: {
        label: "space",
        iconKey: "MessageSquare",
        category: "channel",
      },
      message: {
        label: "message",
        iconKey: "MessageSquare",
        category: "message",
      },
    },
  },

  features: [
    "Semantic search across chat messages and threads",
    "Space and room discovery",
    "Thread-aware conversation grouping",
    "Incremental sync via createTime filtering",
    "Send messages and create spaces via actions",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      redirectPath: "/connectors/setup/google-chat/oauth/callback",
      scopes: [
        "https://www.googleapis.com/auth/chat.spaces.readonly",
        "https://www.googleapis.com/auth/chat.messages.readonly",
        "https://www.googleapis.com/auth/chat.memberships.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
    },
  },

  streams: [
    {
      name: "spaces",
      label: "Spaces",
      description: "Chat spaces, rooms, and group conversations",
      entityType: "resource",
      dataPoints: ["Name", "Type", "Members", "Description"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "messages",
      label: "Messages",
      description: "Chat messages and thread replies",
      entityType: "activity",
      dataPoints: ["Text", "Sender", "Thread", "Timestamp", "Attachments"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 15,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "oauth_input_method",
      label: "Credentials",
      description: "Upload JSON from Google Cloud Console or enter manually.",
      type: "select",
      required: true,
      value: "file",
      options: [
        { label: "Upload JSON", value: "file" },
        { label: "Enter manually", value: "manual" },
      ],
    },
    {
      id: "oauth_credentials_file",
      label: "OAuth Credentials",
      description: "Credentials - OAuth 2.0 Client IDs - Download JSON",
      type: "file",
      required: true,
      value: "",
      accept: ".json",
      fileType: "json",
      dependsOn: { field: "oauth_input_method", value: "file" },
    },
    {
      id: "client_id",
      label: "Client ID",
      description: "From Google Cloud Console",
      type: "text",
      required: true,
      value: "",
      placeholder: "123456789.apps.googleusercontent.com",
      dependsOn: { field: "oauth_input_method", value: "manual" },
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "From Google Cloud Console",
      type: "password",
      required: true,
      value: "",
      dependsOn: { field: "oauth_input_method", value: "manual" },
    },
    {
      id: "sync_direct_messages",
      label: "Sync Direct Messages",
      description:
        "Include direct messages in sync. Disabled by default for privacy.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "include_spaces",
      label: "Include Spaces",
      description:
        "Only sync these spaces (comma-separated names). Leave empty for all.",
      type: "text",
      required: false,
      value: "",
      placeholder: "engineering, product",
    },
    {
      id: "exclude_spaces",
      label: "Exclude Spaces",
      description: "Skip these spaces (comma-separated names).",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "lookback_days",
      label: "History (days)",
      description: "How far back to sync messages. Default: 90 days.",
      type: "text",
      required: false,
      value: "90",
      placeholder: "90",
    },
  ],
};

export default googleChatApp;
