import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const dmActions: ConnectorActionDefinition[] = [
  {
    id: "dm_send",
    name: "Send Direct Message",
    description:
      "Send a direct message to a Slack user. Requires the user's Slack user ID — call user_lookup first to find it by email. Returns the message timestamp and DM channel ID. Use when the user asks to DM, privately message, or directly contact someone.",
    connectorType: "slack",
    resource: "dm",
    category: "create",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "user",
        name: "User",
        type: "string",
        required: true,
        description:
          "Slack user ID (e.g. 'U01234ABCDE'). Call user_lookup with an email to get this.",
      },
      {
        id: "text",
        name: "Text",
        type: "string",
        required: true,
        description: "Message text in Slack mrkdwn format.",
      },
    ],
    outputs: [
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        description: "Message timestamp of the sent DM.",
      },
      {
        id: "channel",
        name: "Channel",
        type: "string",
        description: "DM channel ID created for the conversation.",
      },
    ],
  },
];
