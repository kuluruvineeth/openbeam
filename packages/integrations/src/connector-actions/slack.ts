import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const slackActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "slack",
  connectorName: "Slack",
  connectorIcon: "slack",
  actions: [
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
      idempotent: false,
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
      idempotent: false,
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
      idempotent: false,
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
      idempotent: false,
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
    {
      id: "file_upload",
      name: "Upload File",
      description:
        "Upload a file or text snippet to one or more Slack channels. Returns the file ID. Use when the user asks to share a file, code snippet, or document in Slack.",
      connectorType: "slack",
      resource: "file",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "channels",
          name: "Channels",
          type: "string",
          required: true,
          description:
            "Comma-separated channel IDs to share with (e.g. 'C01234ABCDE,C05678FGHIJ').",
        },
        {
          id: "content",
          name: "Content",
          type: "string",
          required: false,
          description:
            "File content as a string. For text/code snippets, provide content directly.",
        },
        {
          id: "filename",
          name: "Filename",
          type: "string",
          required: false,
          description:
            "Filename with extension (e.g. 'report.csv', 'script.py'). Extension determines syntax highlighting.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: false,
          description: "Display title shown in Slack for the uploaded file.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "File ID",
          type: "string",
          description: "Uploaded file ID.",
        },
      ],
    },
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
    {
      id: "bookmark_add",
      name: "Add Bookmark",
      description:
        "Add a bookmark (pinned link) to a Slack channel. Bookmarks appear at the top of the channel. Use when the user asks to pin a link, bookmark a URL, or save a reference in a channel.",
      connectorType: "slack",
      resource: "bookmark",
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
          description: "Channel ID to add the bookmark to.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description:
            "Display title for the bookmark (e.g. 'Project Wiki', 'Sprint Board').",
        },
        {
          id: "link",
          name: "Link",
          type: "url",
          required: true,
          description:
            "Full URL to bookmark (e.g. 'https://notion.so/project-docs').",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Bookmark ID",
          type: "string",
          description: "Created bookmark ID.",
        },
      ],
    },
  ],
};
