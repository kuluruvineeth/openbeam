import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const labelActions: ConnectorActionDefinition[] = [
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
    idempotent: false,
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
    idempotent: false,
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
        description: "Visibility in message list: 'show' (default) or 'hide'.",
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
];
