import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const fellowActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "fellow",
  connectorName: "Fellow",
  connectorIcon: "fellow",
  actions: [
    {
      id: "action_item_complete",
      name: "Complete Action Item",
      description: "Mark a Fellow action item as completed",
      connectorType: "fellow",
      resource: "action_item",
      category: "update",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "actionItemId",
          name: "Action Item ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "id", name: "Action Item ID", type: "string" }],
    },
    {
      id: "action_item_archive",
      name: "Archive Action Item",
      description: "Archive a Fellow action item",
      connectorType: "fellow",
      resource: "action_item",
      category: "update",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "actionItemId",
          name: "Action Item ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [{ id: "id", name: "Action Item ID", type: "string" }],
    },
  ],
};
