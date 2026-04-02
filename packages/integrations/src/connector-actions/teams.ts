import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const teamsActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "microsoft_teams",
  connectorName: "Microsoft Teams",
  connectorIcon: "teams",
  actions: [
    {
      id: "team_list",
      name: "List Teams",
      description:
        "List all Microsoft Teams the authenticated user has joined. Use this to discover team IDs before listing channels or sending messages.",
      connectorType: "microsoft_teams",
      resource: "team",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [],
      outputs: [{ id: "teams", name: "Teams", type: "array" }],
    },
    {
      id: "channel_list",
      name: "List Channels",
      description:
        "List all channels in a Microsoft Teams team. Use team_list first to get the team ID.",
      connectorType: "microsoft_teams",
      resource: "channel",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "teamId",
          name: "Team ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "channels", name: "Channels", type: "array" }],
    },
    {
      id: "message_send",
      name: "Send Message",
      description:
        "Send a message to a Teams channel. Use team_list and channel_list first to discover the required IDs.",
      connectorType: "microsoft_teams",
      resource: "message",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "team_id", name: "Team ID", type: "string", required: true },
        {
          id: "channel_id",
          name: "Channel ID",
          type: "string",
          required: true,
        },
        {
          id: "content",
          name: "Message Content",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "messageId", name: "Message ID", type: "string" }],
    },
    {
      id: "message_reply",
      name: "Reply to Message",
      description:
        "Reply to a message in a Teams channel. Use team_list and channel_list first to discover the required IDs.",
      connectorType: "microsoft_teams",
      resource: "message",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "team_id", name: "Team ID", type: "string", required: true },
        {
          id: "channel_id",
          name: "Channel ID",
          type: "string",
          required: true,
        },
        {
          id: "message_id",
          name: "Message ID",
          type: "string",
          required: true,
        },
        {
          id: "content",
          name: "Reply Content",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "messageId", name: "Message ID", type: "string" }],
    },
  ],
};
