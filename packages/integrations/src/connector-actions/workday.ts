import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const workdayActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "workday",
  connectorName: "Workday",
  connectorIcon: "workday",
  actions: [
    {
      id: "worker_update",
      name: "Update Worker",
      description: "Update worker fields in Workday",
      connectorType: "workday",
      resource: "worker",
      category: "update",
      stakes: "high",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "worker_id", name: "Worker ID", type: "string", required: true },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description: "JSON object of field name → value pairs",
        },
      ],
      outputs: [{ id: "workerId", name: "Worker ID", type: "string" }],
    },
  ],
};
