import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const userActions: ConnectorActionDefinition[] = [
  {
    id: "user_lookup",
    name: "Lookup User",
    description:
      "Look up a Slack user by email address or user ID. Returns user profile details including display name and ID. Use this before channel_invite, dm_send, or any action that requires a Slack user ID. Provide either email or user_id.",
    connectorType: "slack",
    resource: "user",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "email",
        name: "Email",
        type: "email",
        required: false,
        description:
          "User's email address (e.g. 'jane@company.com'). Preferred way to look up a user.",
      },
      {
        id: "user_id",
        name: "User ID",
        type: "string",
        required: false,
        description:
          "Slack user ID (e.g. 'U01234ABCDE'). Use if you already have the ID and need profile details.",
      },
    ],
    outputs: [
      {
        id: "user",
        name: "User",
        type: "object",
        description:
          "User profile with id, name, email, and display_name fields.",
      },
    ],
  },
];
