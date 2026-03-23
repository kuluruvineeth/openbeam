import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const bamboohrActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "bamboohr",
  connectorName: "BambooHR",
  connectorIcon: "bamboohr",
  actions: [
    {
      id: "time_off_request",
      name: "Request Time Off",
      description: "Submit a time off request for an employee",
      connectorType: "bamboohr",
      resource: "time_off",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "employee_id",
          name: "Employee ID",
          type: "string",
          required: true,
        },
        {
          id: "start",
          name: "Start Date",
          type: "date",
          required: true,
          description: "YYYY-MM-DD",
        },
        {
          id: "end",
          name: "End Date",
          type: "date",
          required: true,
          description: "YYYY-MM-DD",
        },
        {
          id: "time_off_type_id",
          name: "Time Off Type ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [],
    },
  ],
};
