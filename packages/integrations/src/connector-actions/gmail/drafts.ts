import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const draftActions: ConnectorActionDefinition[] = [
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
    idempotent: false,
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
    id: "draft_delete",
    name: "Delete Draft",
    description:
      "Permanently delete a Gmail draft. This action cannot be undone — the draft is removed from Drafts entirely. Requires the draft ID returned from draft_create.",
    connectorType: "gmail",
    resource: "draft",
    category: "delete",
    stakes: "medium",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.compose"],
    inputs: [
      {
        id: "draftId",
        name: "Draft ID",
        type: "string",
        required: true,
        description: "Gmail draft ID to delete. Returned by draft_create.",
      },
    ],
    outputs: [
      {
        id: "deleted",
        name: "Deleted",
        type: "boolean",
        description: "True when the draft was removed.",
      },
    ],
  },
  {
    id: "draft_send",
    name: "Send Draft",
    description:
      "Send an existing Gmail draft. Converts the draft into a sent message in the recipient's inbox. This action cannot be undone — use draft_delete to discard a draft instead.",
    connectorType: "gmail",
    resource: "draft",
    category: "create",
    stakes: "high",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    inputs: [
      {
        id: "draftId",
        name: "Draft ID",
        type: "string",
        required: true,
        description: "Gmail draft ID to send. Returned by draft_create.",
      },
    ],
    outputs: [
      {
        id: "messageId",
        name: "Message ID",
        type: "string",
        description: "Sent message ID — use for email_reply or email_get.",
      },
    ],
  },
];
