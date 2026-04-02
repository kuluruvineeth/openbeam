import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const coupaActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "coupa",
  connectorName: "Coupa",
  connectorIcon: "coupa",
  actions: [
    {
      id: "requisition_create",
      name: "Create Requisition",
      description: "Create a new requisition in Coupa",
      connectorType: "coupa",
      resource: "requisition",
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
          description: "Requisition properties object",
        },
      ],
      outputs: [
        { id: "recordId", name: "Requisition ID", type: "string" },
        { id: "url", name: "Requisition URL", type: "string" },
      ],
    },
    {
      id: "requisition_update",
      name: "Update Requisition",
      description: "Update an existing requisition in Coupa",
      connectorType: "coupa",
      resource: "requisition",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "requisitionId",
          name: "Requisition ID",
          type: "string",
          required: true,
        },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "Fields to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Requisition ID", type: "string" },
        { id: "url", name: "Requisition URL", type: "string" },
      ],
    },
    {
      id: "supplier_create",
      name: "Create Supplier",
      description: "Create a new supplier in Coupa",
      connectorType: "coupa",
      resource: "supplier",
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
          description: "Supplier properties object",
        },
      ],
      outputs: [
        { id: "recordId", name: "Supplier ID", type: "string" },
        { id: "url", name: "Supplier URL", type: "string" },
      ],
    },
    {
      id: "expense_report_create",
      name: "Create Expense Report",
      description: "Create a new expense report in Coupa",
      connectorType: "coupa",
      resource: "expense_report",
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
          description: "Expense report properties",
        },
      ],
      outputs: [
        { id: "recordId", name: "Expense Report ID", type: "string" },
        { id: "url", name: "Expense Report URL", type: "string" },
      ],
    },
  ],
};
