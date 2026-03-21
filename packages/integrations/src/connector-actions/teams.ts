import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const teamsActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "microsoft_teams",
  connectorName: "Microsoft Teams",
  connectorIcon: "teams",
  actions: [
    {
      id: "message_send",
      name: "Send Message",
      description: "Send a message to a Teams channel",
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
      description: "Reply to a message in a Teams channel",
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
