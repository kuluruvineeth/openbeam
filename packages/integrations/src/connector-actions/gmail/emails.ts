import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const emailActions: ConnectorActionDefinition[] = [
  {
    id: "email_send",
    name: "Send Email",
    description:
      "Send a new email via Gmail. Returns the message ID and thread ID. Use when the user asks to send, email, or message someone. This action sends immediately and cannot be undone — use draft_create for a saveable draft instead.",
    connectorType: "gmail",
    resource: "email",
    category: "create",
    stakes: "high",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    inputs: [
      {
        id: "to",
        name: "To",
        type: "email",
        required: true,
        description:
          "Recipient email address(es). For multiple recipients, comma-separate (e.g. 'alice@co.com, bob@co.com').",
      },
      {
        id: "subject",
        name: "Subject",
        type: "string",
        required: true,
        description: "Email subject line.",
      },
      {
        id: "body",
        name: "Body",
        type: "string",
        required: true,
        description:
          "Email body. Supports HTML markup for rich formatting (e.g. '<b>bold</b>', '<a href>links</a>').",
      },
      {
        id: "cc",
        name: "CC",
        type: "email",
        required: false,
        description: "CC recipient email address(es), comma-separated.",
      },
      {
        id: "bcc",
        name: "BCC",
        type: "email",
        required: false,
        description: "BCC recipient email address(es), comma-separated.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Message ID",
        type: "string",
        description:
          "Sent message ID — use for email_reply, email_forward, or email_get.",
      },
      {
        id: "threadId",
        name: "Thread ID",
        type: "string",
        description:
          "Thread ID — use for thread_get to view the full conversation.",
      },
    ],
  },
  {
    id: "email_reply",
    name: "Reply to Email",
    description:
      "Reply to an existing email in its thread. Requires the original message ID — use email_search or email_get to find it. Use when the user asks to reply, respond, or follow up on an email.",
    connectorType: "gmail",
    resource: "email",
    category: "create",
    stakes: "high",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description:
          "Gmail message ID of the email to reply to. Get from email_search results or email_send output.",
      },
      {
        id: "body",
        name: "Body",
        type: "string",
        required: true,
        description: "Reply body. Supports HTML markup.",
      },
      {
        id: "replyAll",
        name: "Reply All",
        type: "boolean",
        required: false,
        description:
          "Set to true to reply to all original recipients (To + CC). Defaults to false (reply to sender only).",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Message ID",
        type: "string",
        description: "Reply message ID.",
      },
      {
        id: "threadId",
        name: "Thread ID",
        type: "string",
        description: "Thread ID of the conversation.",
      },
    ],
  },
  {
    id: "email_forward",
    name: "Forward Email",
    description:
      "Forward an existing email to one or more recipients. Requires the original message ID — use email_search to find it. Use when the user asks to forward, share, or pass along an email.",
    connectorType: "gmail",
    resource: "email",
    category: "create",
    stakes: "high",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description:
          "Gmail message ID of the email to forward. Get from email_search or email_get.",
      },
      {
        id: "to",
        name: "To",
        type: "email",
        required: true,
        description: "Forwarding recipient email address(es), comma-separated.",
      },
      {
        id: "body",
        name: "Body",
        type: "string",
        required: false,
        description:
          "Additional message to prepend above the forwarded content.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Message ID",
        type: "string",
        description: "Forwarded message ID.",
      },
    ],
  },
  {
    id: "email_search",
    name: "Search Emails",
    description:
      "Search for emails using Gmail's query syntax. Returns up to 20 results with message ID, subject, sender, and date. Use this to find emails before replying, forwarding, labeling, or trashing them.",
    connectorType: "gmail",
    resource: "email",
    category: "search",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    inputs: [
      {
        id: "query",
        name: "Query",
        type: "string",
        required: true,
        description:
          "Gmail search query. Supports operators like 'from:user@co.com', 'subject:invoice', 'has:attachment', 'is:unread', 'after:2026/01/01', 'label:important'.",
      },
      {
        id: "maxResults",
        name: "Max Results",
        type: "number",
        required: false,
        description: "Max messages to return (default 20, max 100).",
      },
    ],
    outputs: [
      {
        id: "messages",
        name: "Messages",
        type: "array",
        description:
          "Matching messages with id, threadId, subject, from, date, and snippet.",
      },
      {
        id: "total",
        name: "Total",
        type: "number",
        description: "Estimated total result count.",
      },
    ],
  },
  {
    id: "email_get",
    name: "Get Email",
    description:
      "Retrieve a specific email by message ID. Returns the full message including headers, body, and attachments. Use email_search first to find the message ID, then use this for full content.",
    connectorType: "gmail",
    resource: "email",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: true,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description:
          "Gmail message ID. Get from email_search results, email_send output, or email_reply output.",
      },
    ],
    outputs: [
      {
        id: "message",
        name: "Message",
        type: "object",
        description:
          "Full email with headers (from, to, subject, date), body (plain + HTML), and attachment metadata.",
      },
    ],
  },
  {
    id: "email_trash",
    name: "Trash Email (Legacy)",
    description:
      "DEPRECATED — use message_trash instead. Move an email to Gmail's trash via the legacy email_trash action id. Retained for backward compatibility with existing canvas workflows; will be removed in a future release after canonicalization.",
    connectorType: "gmail",
    resource: "email",
    category: "delete",
    stakes: "medium",
    reversible: true,
    batchSupport: true,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description:
          "Gmail message ID to trash. Get from email_search results.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Message ID",
        type: "string",
        description: "Trashed message ID.",
      },
    ],
  },
  {
    id: "email_modify_labels",
    name: "Modify Labels",
    description:
      "Add or remove Gmail labels from an email. Use label_list first to discover available label IDs. Common system labels: INBOX, UNREAD, STARRED, IMPORTANT, SPAM, TRASH.",
    connectorType: "gmail",
    resource: "email",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to modify. Get from email_search.",
      },
      {
        id: "addLabelIds",
        name: "Add Labels",
        type: "array",
        required: false,
        description:
          "Label IDs to add (e.g. ['STARRED', 'Label_12345']). Call label_list to discover custom label IDs.",
      },
      {
        id: "removeLabelIds",
        name: "Remove Labels",
        type: "array",
        required: false,
        description:
          "Label IDs to remove (e.g. ['UNREAD', 'INBOX']). Use to mark as read (remove UNREAD) or archive (remove INBOX).",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Message ID",
        type: "string",
        description: "Modified message ID.",
      },
      {
        id: "labelIds",
        name: "Label IDs",
        type: "array",
        description: "Current label IDs on the message after modification.",
      },
    ],
  },
];
