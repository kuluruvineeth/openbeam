import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const gmailActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "gmail",
  connectorName: "Gmail",
  connectorIcon: "gmail",
  actions: [
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
          description:
            "Forwarding recipient email address(es), comma-separated.",
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
      name: "Trash Email",
      description:
        "Move an email to Gmail's trash. The email stays in trash for 30 days before permanent deletion. Requires the message ID — use email_search to find it. Use when the user asks to delete, remove, or trash an email.",
      connectorType: "gmail",
      resource: "email",
      category: "delete",
      stakes: "medium",
      reversible: true,
      batchSupport: true,
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
    {
      id: "label_list",
      name: "List Labels",
      description:
        "List all Gmail labels including system labels and custom labels. Returns label IDs and names. Use this FIRST before email_modify_labels to discover available label IDs. No parameters required.",
      connectorType: "gmail",
      resource: "label",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
      inputs: [],
      outputs: [
        {
          id: "labels",
          name: "Labels",
          type: "array",
          description:
            "All labels with id, name, and type (system or user). Use the id for email_modify_labels.",
        },
      ],
    },
    {
      id: "label_create",
      name: "Create Label",
      description:
        "Create a new custom Gmail label. Returns the label ID and name. Use the returned ID with email_modify_labels to apply the label to messages. Use when the user asks to create a new email category or tag.",
      connectorType: "gmail",
      resource: "label",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
      inputs: [
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description:
            "Label name. Use '/' for nesting (e.g. 'Projects/Alpha', 'Clients/Acme').",
        },
        {
          id: "labelListVisibility",
          name: "List Visibility",
          type: "string",
          required: false,
          description:
            "Visibility in Gmail's label list: 'labelShow' (default), 'labelShowIfUnread', or 'labelHide'.",
        },
        {
          id: "messageListVisibility",
          name: "Message Visibility",
          type: "string",
          required: false,
          description:
            "Visibility in message list: 'show' (default) or 'hide'.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Label ID",
          type: "string",
          description:
            "Created label ID — use with email_modify_labels to apply this label.",
        },
        {
          id: "name",
          name: "Name",
          type: "string",
          description: "Created label name.",
        },
      ],
    },
    {
      id: "draft_create",
      name: "Create Draft",
      description:
        "Create an email draft saved in Gmail's Drafts folder. The draft is NOT sent — the user can review and send it from Gmail. Use when the user asks to draft, prepare, or compose an email for later review.",
      connectorType: "gmail",
      resource: "draft",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      requiredScopes: ["https://www.googleapis.com/auth/gmail.compose"],
      inputs: [
        {
          id: "to",
          name: "To",
          type: "email",
          required: false,
          description:
            "Recipient email address(es), comma-separated. Can be left empty for an incomplete draft.",
        },
        {
          id: "subject",
          name: "Subject",
          type: "string",
          required: false,
          description: "Email subject line.",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: false,
          description: "Email body. Supports HTML markup.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Draft ID",
          type: "string",
          description: "Created draft ID.",
        },
        {
          id: "messageId",
          name: "Message ID",
          type: "string",
          description: "Draft message ID — can be used with email_get.",
        },
      ],
    },
    {
      id: "thread_get",
      name: "Get Thread",
      description:
        "Retrieve all messages in an email thread. Returns the full conversation in chronological order. Use email_search to find a message first, then use its threadId to get the full thread.",
      connectorType: "gmail",
      resource: "thread",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      inputs: [
        {
          id: "threadId",
          name: "Thread ID",
          type: "string",
          required: true,
          description:
            "Gmail thread ID. Get from email_search results (threadId field) or email_send output.",
        },
      ],
      outputs: [
        {
          id: "thread",
          name: "Thread",
          type: "object",
          description:
            "Thread object with all messages in chronological order, each containing headers, body, and metadata.",
        },
      ],
    },
    {
      id: "thread_trash",
      name: "Trash Thread",
      description:
        "Move an entire email thread (all messages) to Gmail's trash. The thread stays in trash for 30 days. Requires the thread ID — use email_search to find it. Use when the user asks to delete an entire conversation.",
      connectorType: "gmail",
      resource: "thread",
      category: "delete",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
      inputs: [
        {
          id: "threadId",
          name: "Thread ID",
          type: "string",
          required: true,
          description:
            "Gmail thread ID to trash. Get from email_search results.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Thread ID",
          type: "string",
          description: "Trashed thread ID.",
        },
      ],
    },
  ],
};
