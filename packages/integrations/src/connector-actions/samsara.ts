import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const samsaraActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "samsara",
  connectorName: "Samsara",
  connectorIcon: "samsara",
  actions: [
    {
      id: "alert_resolve",
      name: "Resolve Alert",
      description: "Resolve an active fleet alert",
      connectorType: "samsara",
      resource: "alert",
      category: "update",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "alert_id", name: "Alert ID", type: "string", required: true },
      ],
      outputs: [{ id: "alertId", name: "Alert ID", type: "string" }],
    },
    {
      id: "driver_message",
      name: "Send Driver Message",
      description: "Send a message to a fleet driver",
      connectorType: "samsara",
      resource: "driver",
      category: "notify",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "driver_id", name: "Driver ID", type: "string", required: true },
        { id: "message", name: "Message", type: "string", required: true },
      ],
      outputs: [],
    },
  ],
};
