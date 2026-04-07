import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const permissionActions: ConnectorActionDefinition[] = [
  {
    id: "permission_create",
    name: "Share File",
    description:
      "Share a Google Drive file with a user by granting them a permission role. Requires the file ID and user's email. Use file_search to find the file ID. Use when the user asks to share, give access, or invite someone to a file.",
    connectorType: "google_drive",
    resource: "permission",
    category: "create",
    stakes: "high",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description: "File or folder ID to share. Get from file_search.",
      },
      {
        id: "email",
        name: "Email",
        type: "email",
        required: true,
        description:
          "Email address of the user to share with (e.g. 'jane@company.com').",
      },
      {
        id: "role",
        name: "Role",
        type: "string",
        required: true,
        description:
          "Permission role: 'reader' (view only), 'writer' (edit), or 'commenter' (comment only).",
      },
      {
        id: "sendNotification",
        name: "Send Notification",
        type: "boolean",
        required: false,
        description:
          "Send an email notification to the user about the share. Defaults to true.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Permission ID",
        type: "string",
        description:
          "Created permission ID — use for permission_remove to revoke access later.",
      },
    ],
  },
  {
    id: "permission_remove",
    name: "Remove Access",
    description:
      "Remove a user's access to a Google Drive file. Requires the file ID and user's email. This action is irreversible — the user loses access immediately. Use when the user asks to unshare, revoke access, or remove someone from a file.",
    connectorType: "google_drive",
    resource: "permission",
    category: "delete",
    stakes: "high",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description: "File or folder ID to remove access from.",
      },
      {
        id: "email",
        name: "Email",
        type: "email",
        required: true,
        description: "Email address of the user whose access to revoke.",
      },
    ],
    outputs: [
      {
        id: "ok",
        name: "Success",
        type: "boolean",
        description: "Whether the access removal succeeded.",
      },
    ],
  },
];
