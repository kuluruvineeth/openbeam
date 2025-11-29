import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const slackApp: UnifiedApp = {
  id: AppType.SLACK,
  name: "Slack",
  category: "Communication",
  active: true,
  logo: AppType.SLACK,
  short_description: "Search across messages, channels, and users.",
  description:
    "Connect your Slack workspace to enable AI-powered search across all your team's conversations, files, and knowledge. OpenPlane indexes your data securely and respects all privacy controls you configure.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Slack Technologies, LLC",
  website: "https://slack.com",

  features: [
    "Semantic search across all messages and threads",
    "AI-powered answers directly in Slack",
    "Real-time indexing with instant search results",
    "Automatic identity mapping for @mentions",
    "File and attachment search",
    "Configurable privacy controls per channel type",
  ],

  auth: {
    type: AuthType.OAUTH2,
    config: {
      authUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      redirectPath: "/connectors/setup/slack/oauth/callback",
      // Default scopes - can be overridden by user configuration if needed
      scopes: [
        "channels:read",
        "channels:history",
        "groups:read",
        "groups:history",
        "im:read",
        "im:history",
        "mpim:read",
        "mpim:history",
        "users:read",
        "users:read.email",
        "team:read",
        "chat:write",
        "files:read",
      ],
    },
  },

  streams: [
    {
      name: "users",
      label: "Team Members",
      description: "User profiles for identity mapping and @mention resolution",
      entityType: "identity",
      dataPoints: ["Display Name", "Email", "Profile Photo", "Status"],
      isPii: true,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "channels",
      label: "Channels",
      description: "Channel metadata and directory structure",
      entityType: "resource",
      dataPoints: ["Name", "Topic", "Description", "Members"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "messages",
      label: "Messages & Threads",
      description: "Conversation history from authorized channels",
      entityType: "activity",
      dataPoints: ["Content", "Author", "Timestamp", "Replies", "Reactions"],
      syncMode: SyncMode.REALTIME,
      supportsBackfill: true,
    },
    {
      name: "files",
      label: "Files & Attachments",
      description: "Shared documents and media from conversations",
      entityType: "resource",
      dataPoints: ["Name", "Type", "URL", "Uploaded By"],
      syncMode: SyncMode.REALTIME,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "client_id",
      label: "Client ID",
      description: "Your Slack App Client ID",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "client_secret",
      label: "Client Secret",
      description: "Your Slack App Client Secret",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "signing_secret",
      label: "Signing Secret",
      description: "Your Slack App Signing Secret (for verifying requests)",
      type: "text",
      required: true,
      value: "",
    },
    {
      id: "index_private_channels",
      label: "Index Private Channels",
      description:
        "Allow OpenPlane to index messages in private channels where the OpenPlane bot is added.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "index_dms",
      label: "Index Direct Messages",
      description:
        "Allow indexing of Direct Messages (DMs) where the OpenPlane bot is added. Users must explicitly invite the bot.",
      type: "switch",
      required: false,
      value: false,
    },
    {
      id: "bot_enabled",
      label: "Enable OpenPlane Bot",
      description:
        "Allow the OpenPlane bot to respond to questions directly in Slack channels.",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "auto_join_public_channels",
      label: "Auto-Join Public Channels",
      description:
        "Automatically join public channels to index them. If disabled, only channels where the bot is already a member will be indexed. Recommended: Disable this and manually add the bot to channels you want indexed.",
      type: "switch",
      required: false,
      value: false,
      enabled: false,
    },
    {
      id: "sync_mode",
      label: "Sync Strategy",
      description:
        "Choose how OpenPlane accesses data. 'Real-time' uses events (faster). 'Federated' uses Slack Search API (no storage, slower).",
      type: "select",
      required: true,
      value: "realtime",
      options: [
        { label: "Real-time Indexing (Recommended)", value: "realtime" },
        { label: "Federated Search (No Storage)", value: "federated" },
      ],
    },
    // Federated Search Configuration (only shown when sync_mode is "federated")
    {
      id: "federated_search_all_channels",
      label: "Search All Channels",
      description:
        "Enable to search all accessible channels. When enabled, the Channels field is disabled.",
      type: "switch",
      required: false,
      value: true,
      dependsOn: { field: "sync_mode", value: "federated" },
    },
    {
      id: "federated_channels",
      label: "Channels",
      description:
        "Specify which channels to search (only used if Search All Channels is disabled). Supports glob patterns (e.g., general, eng*, product-*).",
      type: "text",
      required: false,
      value: "",
      placeholder: "general, eng*, product-*",
      dependsOn: { field: "sync_mode", value: "federated" },
    },
    {
      id: "federated_exclude_channels",
      label: "Exclude Channels",
      description:
        "Exclude specific channels from search. Supports glob patterns (e.g., secure-channel, private-*, customer*).",
      type: "text",
      required: false,
      value: "",
      placeholder: "secure-channel, private-*, customer*",
      dependsOn: { field: "sync_mode", value: "federated" },
    },
    {
      id: "federated_include_group_dms",
      label: "Include Group Direct Messages",
      description:
        "Include multi-person direct messages (MPIMs) in search results.",
      type: "switch",
      required: false,
      value: false,
      dependsOn: { field: "sync_mode", value: "federated" },
    },
    {
      id: "federated_default_search_days",
      label: "Default Search Days",
      description:
        "Maximum number of days to search back (default: 30). Increasing this value may degrade answer quality.",
      type: "text",
      required: false,
      value: "30",
      placeholder: "30",
      dependsOn: { field: "sync_mode", value: "federated" },
    },
    {
      id: "federated_max_messages_per_query",
      label: "Max Messages Per Query",
      description:
        "Maximum number of messages to retrieve per search query (default: 25). Higher values provide more context but may be slower.",
      type: "text",
      required: false,
      value: "25",
      placeholder: "25",
      dependsOn: { field: "sync_mode", value: "federated" },
    },
  ],
};

export default slackApp;
