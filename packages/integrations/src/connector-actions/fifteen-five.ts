import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const fifteenFiveActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "fifteen_five",
  connectorName: "15Five",
  connectorIcon: "fifteen-five",
  actions: [
    {
      id: "high_five_create",
      name: "Give High Five",
      description: "Send a High Five recognition in 15Five",
      connectorType: "fifteen_five",
      resource: "high_five",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "senderId",
          name: "Sender ID",
          type: "number",
          required: true,
          description: "User ID of the sender",
        },
        {
          id: "receiverId",
          name: "Receiver ID",
          type: "number",
          required: true,
          description: "User ID of the receiver",
        },
        {
          id: "text",
          name: "Message",
          type: "string",
          required: true,
          description: "High Five message text",
        },
      ],
      outputs: [{ id: "id", name: "High Five ID", type: "string" }],
    },
  ],
};
