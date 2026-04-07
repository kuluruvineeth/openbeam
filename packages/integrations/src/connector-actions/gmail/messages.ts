import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const messageActions: ConnectorActionDefinition[] = [
  {
    id: "message_archive",
    name: "Archive Message",
    description:
      "Archive a Gmail message by removing the INBOX label. The message stays in All Mail and remains searchable. Reversible by re-applying the INBOX label via email_modify_labels.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID. Get from email_search.",
      },
    ],
    outputs: [
      {
        id: "archived",
        name: "Archived",
        type: "boolean",
        description: "True when the message was archived.",
      },
    ],
  },
  {
    id: "message_trash",
    name: "Trash Message",
    description:
      "Move a Gmail message to the trash. Stays in trash for 30 days before automatic deletion. Reversible via message_untrash within the retention window.",
    connectorType: "gmail",
    resource: "message",
    category: "delete",
    stakes: "medium",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to trash. Get from email_search.",
      },
    ],
    outputs: [
      {
        id: "trashed",
        name: "Trashed",
        type: "boolean",
        description: "True when the message was moved to trash.",
      },
    ],
  },
  {
    id: "message_untrash",
    name: "Restore Message",
    description:
      "Restore a previously trashed Gmail message back to its original folders. Only works while the message is still in the trash retention window (30 days).",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to restore from trash.",
      },
    ],
    outputs: [
      {
        id: "untrashed",
        name: "Untrashed",
        type: "boolean",
        description: "True when the message was restored from trash.",
      },
    ],
  },
  {
    id: "message_mark_read",
    name: "Mark Message Read",
    description:
      "Mark a Gmail message as read by removing the UNREAD label. Reversible via message_mark_unread.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to mark as read.",
      },
    ],
    outputs: [
      {
        id: "read",
        name: "Read",
        type: "boolean",
        description: "True when the message was marked as read.",
      },
    ],
  },
  {
    id: "message_mark_unread",
    name: "Mark Message Unread",
    description:
      "Mark a Gmail message as unread by adding the UNREAD label. Reversible via message_mark_read.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to mark as unread.",
      },
    ],
    outputs: [
      {
        id: "unread",
        name: "Unread",
        type: "boolean",
        description: "True when the message was marked as unread.",
      },
    ],
  },
  {
    id: "message_star",
    name: "Star Message",
    description:
      "Star a Gmail message by adding the STARRED label. Reversible via message_unstar.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to star.",
      },
    ],
    outputs: [
      {
        id: "starred",
        name: "Starred",
        type: "boolean",
        description: "True when the message was starred.",
      },
    ],
  },
  {
    id: "message_unstar",
    name: "Unstar Message",
    description:
      "Remove the star from a Gmail message by removing the STARRED label. Reversible via message_star.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to unstar.",
      },
    ],
    outputs: [
      {
        id: "unstarred",
        name: "Unstarred",
        type: "boolean",
        description: "True when the star was removed.",
      },
    ],
  },
  {
    id: "message_add_labels",
    name: "Add Labels",
    description:
      "Add one or more Gmail labels to a message. Use label_list to discover available label IDs. For common system label operations (UNREAD, STARRED) prefer the dedicated message_mark_read / message_star actions.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to label.",
      },
      {
        id: "labelIds",
        name: "Label IDs",
        type: "array",
        required: true,
        description:
          "Label IDs to add (e.g. ['Label_12345']). Call label_list to discover custom label IDs.",
      },
    ],
    outputs: [
      {
        id: "labeled",
        name: "Labeled",
        type: "boolean",
        description: "True when labels were added.",
      },
    ],
  },
  {
    id: "message_remove_labels",
    name: "Remove Labels",
    description:
      "Remove one or more Gmail labels from a message. Use label_list to discover available label IDs. Reversible via message_add_labels.",
    connectorType: "gmail",
    resource: "message",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: true,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        required: true,
        description: "Gmail message ID to remove labels from.",
      },
      {
        id: "labelIds",
        name: "Label IDs",
        type: "array",
        required: true,
        description:
          "Label IDs to remove (e.g. ['UNREAD', 'INBOX']). Use to mark as read (remove UNREAD) or archive (remove INBOX).",
      },
    ],
    outputs: [
      {
        id: "removed",
        name: "Removed",
        type: "boolean",
        description: "True when labels were removed.",
      },
    ],
  },
];
