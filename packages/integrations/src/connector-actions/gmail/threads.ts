import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const threadActions: ConnectorActionDefinition[] = [
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
    idempotent: true,
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
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.modify"],
    inputs: [
      {
        id: "threadId",
        name: "Thread ID",
        type: "string",
        required: true,
        description: "Gmail thread ID to trash. Get from email_search results.",
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
];
