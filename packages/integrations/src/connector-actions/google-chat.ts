import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const googleChatActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "google_chat",
  connectorName: "Google Chat",
  connectorIcon: "google-chat",
  actions: [
    {
      id: "message_send",
      name: "Send Message",
      description: "Send a message to a Google Chat space",
      connectorType: "google_chat",
      resource: "message",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "space_name",
          name: "Space",
          type: "string",
          required: true,
          description: "Space resource name (e.g., spaces/AAAA)",
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
