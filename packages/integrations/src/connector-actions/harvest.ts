import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const harvestActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "harvest",
  connectorName: "Harvest",
  connectorIcon: "harvest",
  actions: [
    {
      id: "time_entry_create",
      name: "Create Time Entry",
      description: "Log a new time entry in Harvest",
      connectorType: "harvest",
      resource: "time_entry",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description:
            "Time entry properties (project_id, task_id, hours, spent_date, etc.)",
        },
      ],
      outputs: [{ id: "recordId", name: "Time Entry ID", type: "string" }],
    },
    {
      id: "time_entry_update",
      name: "Update Time Entry",
      description: "Update an existing Harvest time entry",
      connectorType: "harvest",
      resource: "time_entry",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "entryId", name: "Entry ID", type: "string", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
        },
      ],
      outputs: [{ id: "recordId", name: "Time Entry ID", type: "string" }],
    },
    {
      id: "timer_stop",
      name: "Stop Timer",
      description: "Stop a running Harvest timer",
      connectorType: "harvest",
      resource: "time_entry",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "entryId", name: "Entry ID", type: "string", required: true },
      ],
      outputs: [{ id: "recordId", name: "Time Entry ID", type: "string" }],
    },
    {
      id: "timer_restart",
      name: "Restart Timer",
      description: "Restart a stopped Harvest timer",
      connectorType: "harvest",
      resource: "time_entry",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "entryId", name: "Entry ID", type: "string", required: true },
      ],
      outputs: [{ id: "recordId", name: "Time Entry ID", type: "string" }],
    },
    {
      id: "expense_create",
      name: "Create Expense",
      description: "Create a new expense in Harvest",
      connectorType: "harvest",
      resource: "expense",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description:
            "Expense properties (project_id, expense_category_id, total_cost, spent_date, etc.)",
        },
      ],
      outputs: [{ id: "recordId", name: "Expense ID", type: "string" }],
    },
  ],
};
