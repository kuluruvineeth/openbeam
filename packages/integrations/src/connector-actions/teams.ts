import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const teamsActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "microsoft_teams",
  connectorName: "Microsoft Teams",
  connectorIcon: "teams",
  actions: [
    {
      id: "team_list",
      name: "List Teams",
      description:
        "List all Microsoft Teams the authenticated user has joined. Returns each team's ID, name, and description. Use this FIRST to discover team IDs before calling channel_list, message_send, or message_reply. No parameters required.",
      connectorType: "microsoft_teams",
      resource: "team",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [],
      outputs: [
        {
          id: "teams",
          name: "Teams",
          type: "array",
          description:
            "Array of teams with id, displayName, and description. Use the id for channel_list.",
        },
      ],
    },
    {
      id: "channel_list",
      name: "List Channels",
      description:
        "List all channels in a Microsoft Teams team. Requires teamId — call team_list first. Returns channel IDs and names. Use this before message_send or message_reply to discover the required channel_id.",
      connectorType: "microsoft_teams",
      resource: "channel",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "teamId",
          name: "Team ID",
          type: "string",
          required: true,
          description:
            "Microsoft Teams team ID. Call team_list to discover available team IDs.",
        },
      ],
      outputs: [
        {
          id: "channels",
          name: "Channels",
          type: "array",
          description:
            "Array of channels with id, displayName, and description. Use the id for message_send.",
        },
      ],
    },
    {
      id: "message_send",
      name: "Send Message",
      description:
        "Send a message to a Microsoft Teams channel. Requires team_id and channel_id — call team_list then channel_list first to discover them. Returns the message ID. Use when the user asks to post, send, or share in a Teams channel.",
      connectorType: "microsoft_teams",
      resource: "message",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "team_id",
          name: "Team ID",
          type: "string",
          required: true,
          description: "Teams team ID. Get from team_list.",
        },
        {
          id: "channel_id",
          name: "Channel ID",
          type: "string",
          required: true,
          description: "Teams channel ID. Get from channel_list.",
        },
        {
          id: "content",
          name: "Message Content",
          type: "string",
          required: true,
          description:
            "Message content. Supports HTML formatting (e.g. '<b>bold</b>', '<a href>links</a>').",
        },
      ],
      outputs: [
        {
          id: "messageId",
          name: "Message ID",
          type: "string",
          description:
            "Sent message ID — use for message_reply to respond in the thread.",
        },
      ],
    },
    {
      id: "message_reply",
      name: "Reply to Message",
      description:
        "Reply to a message in a Microsoft Teams channel thread. Requires team_id, channel_id, and message_id. Call team_list and channel_list first to discover the team and channel IDs. Use when the user asks to respond to or follow up on a Teams message.",
      connectorType: "microsoft_teams",
      resource: "message",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "team_id",
          name: "Team ID",
          type: "string",
          required: true,
          description: "Teams team ID. Get from team_list.",
        },
        {
          id: "channel_id",
          name: "Channel ID",
          type: "string",
          required: true,
          description: "Teams channel ID. Get from channel_list.",
        },
        {
          id: "message_id",
          name: "Message ID",
          type: "string",
          required: true,
          description:
            "Parent message ID to reply to. Get from message_send output or search_documents results.",
        },
        {
          id: "content",
          name: "Reply Content",
          type: "string",
          required: true,
          description: "Reply content. Supports HTML formatting.",
        },
      ],
      outputs: [
        {
          id: "messageId",
          name: "Message ID",
          type: "string",
          description: "Reply message ID.",
        },
      ],
    },
  ],
};
