import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const verkadaActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "verkada",
  connectorName: "Verkada",
  connectorIcon: "verkada",
  actions: [
    {
      id: "door_unlock",
      name: "Unlock Door",
      description: "Unlock an access-controlled door",
      connectorType: "verkada",
      resource: "door",
      category: "update",
      stakes: "high",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "door_id", name: "Door ID", type: "string", required: true },
      ],
      outputs: [{ id: "doorId", name: "Door ID", type: "string" }],
    },
    {
      id: "door_lock",
      name: "Lock Door",
      description: "Lock an access-controlled door",
      connectorType: "verkada",
      resource: "door",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "door_id", name: "Door ID", type: "string", required: true },
      ],
      outputs: [{ id: "doorId", name: "Door ID", type: "string" }],
    },
  ],
};
