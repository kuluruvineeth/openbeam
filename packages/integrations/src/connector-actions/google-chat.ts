import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const googleChatActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "google_chat",
  connectorName: "Google Chat",
  connectorIcon: "google-chat",
  actions: [
    {
      id: "space_list",
      name: "List Spaces",
      description:
        "List all Google Chat spaces the user belongs to. Use this to discover the space_name needed by message_send.",
      connectorType: "google_chat",
      resource: "space",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [],
      outputs: [{ id: "spaces", name: "Spaces", type: "array" }],
    },
    {
      id: "message_send",
      name: "Send Message",
      description:
        "Send a message to a Google Chat space. Use space_list first to discover the space_name.",
      connectorType: "google_chat",
      resource: "message",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "space_name",
          name: "Space",
          type: "string",
          required: true,
          description:
            "Space resource name (e.g., spaces/AAAA). Use space_list to discover available spaces.",
        },
        {
          id: "text",
          name: "Message Text",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "messageId", name: "Message ID", type: "string" }],
    },
  ],
};
