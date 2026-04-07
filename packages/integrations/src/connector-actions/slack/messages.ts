import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const messageActions: ConnectorActionDefinition[] = [
  {
    id: "message_send",
    name: "Send Message",
    description:
      "Send a message to a Slack channel. Requires a channel ID — use message_search or search_documents to find the channel first. Returns the message timestamp (ts) and channel ID. Use when the user asks to post, send, or share something in Slack.",
    connectorType: "slack",
    resource: "message",
    category: "create",
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
        description:
          "Slack channel ID (e.g. 'C01234ABCDE'). Use message_search or search_documents to find channel IDs.",
      },
      {
        id: "text",
        name: "Text",
        type: "string",
        required: true,
        description:
          "Message text. Supports Slack mrkdwn format (e.g. *bold*, _italic_, <URL|link text>).",
      },
      {
        id: "thread_ts",
        name: "Thread Timestamp",
        type: "string",
        required: false,
        description:
          "Parent message timestamp to reply in a thread (e.g. '1234567890.123456'). Omit to post as a new message.",
      },
      {
        id: "blocks",
        name: "Blocks",
        type: "array",
        required: false,
        description:
          "Slack Block Kit JSON array for rich message layouts. Overrides text for display but text is still used for notifications.",
      },
    ],
    outputs: [
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        description:
          "Message timestamp ID — save this to reply via message_reply or update via message_update.",
      },
      {
        id: "channel",
        name: "Channel",
        type: "string",
        description: "Channel ID where the message was posted.",
      },
    ],
  },
  {
    id: "message_update",
    name: "Update Message",
    description:
      "Update an existing Slack message. Requires the channel ID and message timestamp (ts) from a previous message_send or message_search result. Only the specified text/blocks are modified.",
    connectorType: "slack",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description:
          "Slack channel ID (e.g. 'C01234ABCDE') where the message exists.",
      },
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        required: true,
        description:
          "Message timestamp to update (e.g. '1234567890.123456'). Get this from message_send output or message_search results.",
      },
      {
        id: "text",
        name: "Text",
        type: "string",
        required: true,
        description: "Replacement message text in Slack mrkdwn format.",
      },
      {
        id: "blocks",
        name: "Blocks",
        type: "array",
        required: false,
        description:
          "Replacement Block Kit JSON array. If provided, replaces the entire block layout.",
      },
    ],
    outputs: [
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        description: "Updated message timestamp.",
      },
    ],
  },
  {
    id: "message_delete",
    name: "Delete Message",
    description:
      "Permanently delete a Slack message. Requires the channel ID and message timestamp (ts). This action is irreversible. Use message_search to find the message first if needed.",
    connectorType: "slack",
    resource: "message",
    category: "delete",
    stakes: "medium",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description: "Slack channel ID where the message exists.",
      },
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        required: true,
        description:
          "Message timestamp to delete (e.g. '1234567890.123456'). Get this from message_send or message_search.",
      },
    ],
    outputs: [
      {
        id: "ok",
        name: "Success",
        type: "boolean",
        description: "Whether the deletion succeeded.",
      },
    ],
  },
  {
    id: "message_reply",
    name: "Reply to Message",
    description:
      "Reply to a message in a Slack thread. Requires channel ID and the parent message's timestamp (thread_ts). Returns the reply's timestamp. Use when the user asks to respond to or follow up on a Slack message.",
    connectorType: "slack",
    resource: "message",
    category: "create",
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
        description: "Slack channel ID where the parent message exists.",
      },
      {
        id: "thread_ts",
        name: "Thread Timestamp",
        type: "string",
        required: true,
        description:
          "Parent message timestamp to reply to (e.g. '1234567890.123456'). Get this from message_send output or message_search results.",
      },
      {
        id: "text",
        name: "Text",
        type: "string",
        required: true,
        description: "Reply text in Slack mrkdwn format.",
      },
    ],
    outputs: [
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        description: "Reply message timestamp.",
      },
    ],
  },
  {
    id: "message_add_reaction",
    name: "Add Reaction",
    description:
      "Add an emoji reaction to a Slack message. Requires the channel ID and message timestamp. Use when the user asks to react to, acknowledge, or emoji a message.",
    connectorType: "slack",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description: "Slack channel ID where the message exists.",
      },
      {
        id: "ts",
        name: "Timestamp",
        type: "string",
        required: true,
        description:
          "Message timestamp to react to (e.g. '1234567890.123456').",
      },
      {
        id: "name",
        name: "Emoji",
        type: "string",
        required: true,
        description:
          "Emoji name without colons (e.g. 'thumbsup', 'white_check_mark', 'eyes').",
      },
    ],
    outputs: [
      {
        id: "ok",
        name: "Success",
        type: "boolean",
        description: "Whether the reaction was added.",
      },
    ],
  },
  {
    id: "message_search",
    name: "Search Messages",
    description:
      "Search for messages across Slack channels matching a query string. Returns up to 20 results with channel, timestamp, and text. Use this to find messages before replying, reacting, or referencing them. Also useful to discover channel IDs.",
    connectorType: "slack",
    resource: "message",
    category: "search",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "query",
        name: "Query",
        type: "string",
        required: true,
        description:
          "Slack search query. Supports modifiers like 'from:@user', 'in:#channel', 'has:link', 'before:2026-01-01'.",
      },
      {
        id: "count",
        name: "Count",
        type: "number",
        required: false,
        description: "Max results to return (default 20, max 100).",
      },
      {
        id: "sort",
        name: "Sort",
        type: "string",
        required: false,
        description:
          "Sort order: 'score' (relevance, default) or 'timestamp' (newest first).",
      },
    ],
    outputs: [
      {
        id: "messages",
        name: "Messages",
        type: "array",
        description:
          "Matching messages with channel, ts, text, and user fields.",
      },
      {
        id: "total",
        name: "Total",
        type: "number",
        description: "Total number of matches found.",
      },
    ],
  },
];
