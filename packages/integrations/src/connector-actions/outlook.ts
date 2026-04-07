import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const outlookActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "outlook",
  connectorName: "Microsoft Outlook",
  connectorIcon: "outlook",
  actions: [
    {
      id: "email_send",
      name: "Send Email",
      description:
        "Send an email via Microsoft Outlook. Returns the message ID. Sends immediately and cannot be undone. Use when the user asks to send, email, or message someone through Outlook.",
      connectorType: "outlook",
      resource: "email",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "to",
          name: "To",
          type: "array",
          required: true,
          description:
            "Array of recipient email addresses (e.g. ['alice@co.com', 'bob@co.com']).",
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
            "Email body content. Set is_html to true for HTML formatting.",
        },
        {
          id: "cc",
          name: "CC",
          type: "array",
          required: false,
          description: "Array of CC recipient email addresses.",
        },
        {
          id: "bcc",
          name: "BCC",
          type: "array",
          required: false,
          description: "Array of BCC recipient email addresses.",
        },
        {
          id: "is_html",
          name: "HTML Body",
          type: "boolean",
          required: false,
          description:
            "Set to true if body contains HTML markup. Defaults to false (plain text).",
          default: false,
        },
      ],
      outputs: [
        {
          id: "messageId",
          name: "Message ID",
          type: "string",
          description: "Sent message ID — use for email_reply or email_move.",
        },
      ],
    },
    {
      id: "email_reply",
      name: "Reply to Email",
      description:
        "Reply to an existing Outlook email thread. Requires the message_id — use search_documents to find it. Use when the user asks to reply, respond, or follow up on an Outlook email.",
      connectorType: "outlook",
      resource: "email",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "message_id",
          name: "Message ID",
          type: "string",
          required: true,
          description:
            "Outlook message ID of the email to reply to. Get from email_send output or search_documents results.",
        },
        {
          id: "body",
          name: "Reply Body",
          type: "string",
          required: true,
          description: "Reply body content.",
        },
        {
          id: "reply_all",
          name: "Reply All",
          type: "boolean",
          required: false,
          description:
            "Set to true to reply to all recipients (To + CC). Defaults to false (reply to sender only).",
          default: false,
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
    {
      id: "email_move",
      name: "Move Email",
      description:
        "Move an Outlook email to a different mail folder. Requires message_id and destination_folder_id — call folder_list first to discover available folder IDs. Use when the user asks to move, organize, or file an email.",
      connectorType: "outlook",
      resource: "email",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "message_id",
          name: "Message ID",
          type: "string",
          required: true,
          description:
            "Outlook message ID to move. Get from email_send or search_documents.",
        },
        {
          id: "destination_folder_id",
          name: "Destination Folder ID",
          type: "string",
          required: true,
          description:
            "Target folder ID. Call folder_list to discover available folders and their IDs. Common folders: Inbox, Drafts, SentItems, DeletedItems, Archive.",
        },
      ],
      outputs: [
        {
          id: "messageId",
          name: "Message ID",
          type: "string",
          description: "Moved message ID (may change after move).",
        },
      ],
    },
    {
      id: "folder_list",
      name: "List Mail Folders",
      description:
        "List all mail folders in the user's Outlook mailbox. Returns folder IDs, display names, and unread counts. Use this FIRST before email_move to discover the destination_folder_id. No parameters required.",
      connectorType: "outlook",
      resource: "folder",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [],
      outputs: [
        {
          id: "folders",
          name: "Folders",
          type: "array",
          description:
            "Array of mail folders with id, displayName, unreadItemCount, and totalItemCount. Use the id for email_move.",
        },
      ],
    },
  ],
};
