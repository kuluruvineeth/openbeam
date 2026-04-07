import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const channelActions: ConnectorActionDefinition[] = [
  {
    id: "channel_create",
    name: "Create Channel",
    description:
      "Create a new Slack channel. Returns the channel ID and name. Use when the user asks to create, set up, or start a new channel. After creating, use channel_invite to add members.",
    connectorType: "slack",
    resource: "channel",
    category: "create",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "name",
        name: "Name",
        type: "string",
        required: true,
        description:
          "Channel name. Must be lowercase, no spaces, max 80 chars (e.g. 'project-alpha', 'team-updates').",
      },
      {
        id: "is_private",
        name: "Private",
        type: "boolean",
        required: false,
        description:
          "Set to true for a private channel. Defaults to false (public).",
      },
      {
        id: "description",
        name: "Description",
        type: "string",
        required: false,
        description: "Channel purpose/description shown in channel details.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Channel ID",
        type: "string",
        description:
          "Created channel ID — use this for message_send, channel_invite, etc.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Created channel name.",
      },
    ],
  },
  {
    id: "channel_archive",
    name: "Archive Channel",
    description:
      "Archive a Slack channel, hiding it from the channel list. This is reversible by a workspace admin. Use when the user asks to close, archive, or retire a channel.",
    connectorType: "slack",
    resource: "channel",
    category: "update",
    stakes: "high",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description:
          "Channel ID to archive (e.g. 'C01234ABCDE'). Use message_search or search_documents to find the channel ID.",
      },
    ],
    outputs: [
      {
        id: "ok",
        name: "Success",
        type: "boolean",
        description: "Whether the archive succeeded.",
      },
    ],
  },
  {
    id: "channel_set_topic",
    name: "Set Channel Topic",
    description:
      "Set or update a Slack channel's topic. The topic appears at the top of the channel. Use when the user asks to change, set, or update a channel topic.",
    connectorType: "slack",
    resource: "channel",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description: "Channel ID to update.",
      },
      {
        id: "topic",
        name: "Topic",
        type: "string",
        required: true,
        description:
          "New topic text. Supports Slack mrkdwn. Max 250 characters.",
      },
    ],
    outputs: [
      {
        id: "topic",
        name: "Topic",
        type: "string",
        description: "The updated topic text.",
      },
    ],
  },
  {
    id: "channel_invite",
    name: "Invite to Channel",
    description:
      "Invite one or more users to a Slack channel. Requires channel ID and user IDs. Use user_lookup to find user IDs by email first. Use after channel_create to populate a new channel.",
    connectorType: "slack",
    resource: "channel",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: false,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description: "Channel ID to invite users to.",
      },
      {
        id: "user",
        name: "User",
        type: "string",
        required: true,
        description:
          "Slack user ID(s) to invite (e.g. 'U01234ABCDE'). For multiple users, comma-separate. Use user_lookup to find IDs by email.",
      },
    ],
    outputs: [
      {
        id: "ok",
        name: "Success",
        type: "boolean",
        description: "Whether the invite succeeded.",
      },
    ],
  },
];
