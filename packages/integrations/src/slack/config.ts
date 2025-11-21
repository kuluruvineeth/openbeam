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
      redirectPath: "/integrations/slack/oauth/callback",
      // Default scopes - can be overridden by user configuration if needed
      scopes: [
        "channels:read", // Public channels
        "channels:history", // Read public channel messages
        "groups:read", // Private channels
        "groups:history", // Read private channel messages
        "im:read", // DMs
        "im:history", // Read DM messages
        "mpim:read", // Group DMs
        "mpim:history", // Read group DM messages
        "users:read", // Users
        "users:read.email", // User emails
        "team:read", // Workspace info
        "chat:write", // Bot responses
        "files:read", // Files
        // Note: search:read is not a valid Slack OAuth scope
        // Search functionality uses the bot token from OAuth flow
      ],
      scopeDetails: [
        {
          name: "channels:read",
          description:
            "View basic information about public channels in a workspace",
        },
        {
          name: "channels:history",
          description:
            "View messages and other content in public channels that OpenPlane has been added to",
        },
        {
          name: "groups:read",
          description:
            "View basic information about private channels that OpenPlane has been added to",
        },
        {
          name: "groups:history",
          description:
            "View messages and other content in private channels that OpenPlane has been added to",
        },
        {
          name: "im:read",
          description:
            "View basic information about direct messages that OpenPlane has been added to",
        },
        {
          name: "im:history",
          description:
            "View messages and other content in direct messages that OpenPlane has been added to",
        },
        {
          name: "mpim:read",
          description:
            "View basic information about group direct messages that OpenPlane has been added to",
        },
        {
          name: "mpim:history",
          description:
            "View messages and other content in group direct messages that OpenPlane has been added to",
        },
        { name: "users:read", description: "View people in a workspace" },
        {
          name: "users:read.email",
          description:
            "View email addresses of people in a workspace (for identity mapping)",
        },
        {
          name: "team:read",
          description: "View the name, email domain, and icon for a workspace",
        },
        {
          name: "files:read",
          description: "View files shared in channels and conversations",
        },
        {
          name: "chat:write",
          description:
            "Post messages to channels on your behalf (only when you explicitly send a message)",
        },
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
  ],
};

export default slackApp;
